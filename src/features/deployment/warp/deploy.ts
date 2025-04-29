// TODO: Most of this file has bee copied from the CLI's /src/deploy/warp.ts
// Long-term, both should be replaced by EvmERC20WarpModule when it's ready for prod
import { useMutation } from '@tanstack/react-query';
import { useToastError } from '../../../components/toast/useToastError';
import { logger } from '../../../utils/logger';
import { useMultiProvider } from '../../chains/hooks';
import { DeployerWallets } from '../../deployerWallet/types';
import { useDeployerWallets } from '../../deployerWallet/wallets';
import { WarpDeploymentConfig } from '../types';
// eslint-disable-next-line camelcase
import { ProxyAdmin__factory } from '@hyperlane-xyz/core';
import { chainAddresses as registryChainAddresses } from '@hyperlane-xyz/registry';
import {
  ContractVerifier,
  EvmHookModule,
  EvmIsmModule,
  HookConfig,
  HypERC20Deployer,
  HypTokenRouterConfig,
  HyperlaneContractsMap,
  HyperlaneProxyFactoryDeployer,
  IsmConfig,
  MultiProvider,
  ProviderType,
  TOKEN_TYPE_TO_STANDARD,
  TokenFactories,
  WarpCoreConfig,
  WarpRouteDeployConfigMailboxRequired,
  getTokenConnectionId,
  isCollateralTokenConfig,
  isTokenMetadata,
} from '@hyperlane-xyz/sdk';
import { Address, ProtocolType, assert, objMap, promiseObjAll, sleep } from '@hyperlane-xyz/utils';
import { useCallback, useMemo, useState } from 'react';
import { hasPendingTx } from '../../deployerWallet/transactions';

const NUM_SECONDS_FOR_TX_WAIT = 10;

export function useWarpDeployment(
  deploymentConfig?: WarpDeploymentConfig,
  onSuccess?: (config: WarpCoreConfig) => void,
  onFailure?: (error: Error) => void,
) {
  const [isCancelled, setIsCancelled] = useState(false);

  const multiProtocolProvider = useMultiProvider();
  const multiProvider = useMemo(
    () => multiProtocolProvider.toMultiProvider(),
    [multiProtocolProvider],
  );
  const { wallets } = useDeployerWallets();

  const { error, mutate, isIdle, isPending } = useMutation({
    mutationKey: ['warpDeploy', deploymentConfig, wallets],
    mutationFn: () => {
      setIsCancelled(false);
      return executeDeploy(multiProvider, wallets, deploymentConfig);
    },
    retry: false,
    onError: async (e: Error) => {
      await haltDeployment(multiProvider, wallets, deploymentConfig?.chains);
      if (!isCancelled) onFailure?.(e);
    },
    onSuccess: (r: WarpCoreConfig) => {
      if (!isCancelled) onSuccess?.(r);
    },
  });

  useToastError(!isCancelled && error, 'Error deploying warp route.');

  const cancel = useCallback(async () => {
    if (!isPending) return;
    setIsCancelled(true);
    logger.debug('Cancelling deployment');
    await haltDeployment(multiProvider, wallets, deploymentConfig?.chains);
    // multiProvider is intentionally excluded from the deps array
    // to ensure that this cancel callback remains bound to the
    // one used in the active deployment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  return {
    deploy: mutate,
    isIdle,
    isPending,
    cancel,
  };
}

// TODO multi-protocol support
export async function executeDeploy(
  multiProvider: MultiProvider,
  wallets: DeployerWallets,
  typedConfig?: WarpDeploymentConfig,
): Promise<WarpCoreConfig> {
  assert(typedConfig, 'Warp deployment config is required');
  logger.info('Executing warp route deployment');

  const deploymentConfig: WarpRouteDeployConfigMailboxRequired = objMap(
    typedConfig.config,
    (chainName, deployConfig) => ({
      ...deployConfig,
      mailbox: registryChainAddresses[chainName].mailbox,
    }),
  );
  const evmWallet = wallets[ProtocolType.Ethereum];
  assert(evmWallet?.type === ProviderType.EthersV5, 'EVM wallet is required for deployment');
  multiProvider.setSharedSigner(evmWallet.wallet);

  const deployer = new HypERC20Deployer(multiProvider);

  const ismFactoryDeployer = new HyperlaneProxyFactoryDeployer(multiProvider);

  // For each chain in WarpRouteConfig, deploy each Ism Factory, if it's not in the registry
  // Then return a modified config with the ism and/or hook address as a string
  const modifiedConfig = await resolveWarpIsmAndHook(
    deploymentConfig,
    multiProvider,
    ismFactoryDeployer,
  );

  const deployedContracts = await deployer.deploy(modifiedConfig);

  const warpCoreConfig = await getWarpCoreConfig(
    multiProvider,
    deploymentConfig,
    deployedContracts,
  );

  logger.info('Done warp route deployment');
  return warpCoreConfig;
}

async function resolveWarpIsmAndHook(
  deployConfig: WarpRouteDeployConfigMailboxRequired,
  multiProvider: MultiProvider,
  ismFactoryDeployer: HyperlaneProxyFactoryDeployer,
  contractVerifier?: ContractVerifier,
): Promise<WarpRouteDeployConfigMailboxRequired> {
  return promiseObjAll(
    objMap(deployConfig, async (chain, config) => {
      const chainAddresses: Record<string, string> = registryChainAddresses[chain];

      assert(chainAddresses, `Factory addresses not found for ${chain}.`);

      config.interchainSecurityModule = await createWarpIsm({
        chain,
        chainAddresses,
        multiProvider,
        contractVerifier,
        ismFactoryDeployer,
        warpConfig: config,
      });

      config.hook = await createWarpHook({
        chain,
        chainAddresses,
        multiProvider,
        contractVerifier,
        ismFactoryDeployer,
        warpConfig: config,
      });
      return config;
    }),
  );
}

/**
 * Deploys the Warp ISM for a given config
 *
 * @returns The deployed ism address
 */
async function createWarpIsm({
  chain,
  chainAddresses,
  multiProvider,
  contractVerifier,
  warpConfig,
}: {
  chain: string;
  chainAddresses: Record<string, string>;
  multiProvider: MultiProvider;
  contractVerifier?: ContractVerifier;
  warpConfig: HypTokenRouterConfig;
  ismFactoryDeployer: HyperlaneProxyFactoryDeployer;
}): Promise<IsmConfig | undefined> {
  const { interchainSecurityModule } = warpConfig;
  if (!interchainSecurityModule || typeof interchainSecurityModule === 'string') {
    logger.debug(
      `Config Ism is ${
        !interchainSecurityModule ? 'empty' : interchainSecurityModule
      }, skipping deployment.`,
    );
    return interchainSecurityModule;
  }

  logger.debug(`Creating ${interchainSecurityModule.type} ISM for token on ${chain} chain...`);

  const {
    mailbox,
    domainRoutingIsmFactory,
    staticAggregationHookFactory,
    staticAggregationIsmFactory,
    staticMerkleRootMultisigIsmFactory,
    staticMessageIdMultisigIsmFactory,
    staticMerkleRootWeightedMultisigIsmFactory,
    staticMessageIdWeightedMultisigIsmFactory,
  } = chainAddresses;
  const evmIsmModule = await EvmIsmModule.create({
    chain,
    mailbox,
    multiProvider,
    proxyFactoryFactories: {
      domainRoutingIsmFactory,
      staticAggregationHookFactory,
      staticAggregationIsmFactory,
      staticMerkleRootMultisigIsmFactory,
      staticMessageIdMultisigIsmFactory,
      staticMerkleRootWeightedMultisigIsmFactory,
      staticMessageIdWeightedMultisigIsmFactory,
    },
    config: interchainSecurityModule,
    contractVerifier,
  });
  const { deployedIsm } = evmIsmModule.serialize();
  return deployedIsm;
}

async function createWarpHook({
  chain,
  chainAddresses,
  multiProvider,
  contractVerifier,
  warpConfig,
}: {
  chain: string;
  chainAddresses: Record<string, string>;
  multiProvider: MultiProvider;
  contractVerifier?: ContractVerifier;
  warpConfig: HypTokenRouterConfig;
  ismFactoryDeployer: HyperlaneProxyFactoryDeployer;
}): Promise<HookConfig | undefined> {
  const { hook } = warpConfig;

  if (!hook || typeof hook === 'string') {
    logger.debug(`Config Hook is ${!hook ? 'empty' : hook}, skipping deployment.`);
    return hook;
  }

  logger.debug(`Loading registry factory addresses for ${chain}...`);

  logger.debug(`Creating ${hook.type} Hook for token on ${chain} chain...`);

  const {
    mailbox,
    domainRoutingIsmFactory,
    staticAggregationHookFactory,
    staticAggregationIsmFactory,
    staticMerkleRootMultisigIsmFactory,
    staticMessageIdMultisigIsmFactory,
    staticMerkleRootWeightedMultisigIsmFactory,
    staticMessageIdWeightedMultisigIsmFactory,
  } = chainAddresses;
  const proxyFactoryFactories = {
    domainRoutingIsmFactory,
    staticAggregationHookFactory,
    staticAggregationIsmFactory,
    staticMerkleRootMultisigIsmFactory,
    staticMessageIdMultisigIsmFactory,
    staticMerkleRootWeightedMultisigIsmFactory,
    staticMessageIdWeightedMultisigIsmFactory,
  };

  // If config.proxyadmin.address exists, then use that. otherwise deploy a new proxyAdmin
  const proxyAdminAddress: Address =
    warpConfig.proxyAdmin?.address ??
    (await multiProvider.handleDeploy(chain, new ProxyAdmin__factory(), [])).address;

  const evmHookModule = await EvmHookModule.create({
    chain,
    multiProvider,
    coreAddresses: {
      mailbox,
      proxyAdmin: proxyAdminAddress,
    },
    config: hook,
    contractVerifier,
    proxyFactoryFactories,
  });
  logger.debug(`Finished creating ${hook.type} Hook for token on ${chain} chain.`);
  const { deployedHook } = evmHookModule.serialize();
  return deployedHook;
}

async function getWarpCoreConfig(
  multiProvider: MultiProvider,
  warpDeployConfig: WarpRouteDeployConfigMailboxRequired,
  contracts: HyperlaneContractsMap<TokenFactories>,
): Promise<WarpCoreConfig> {
  const warpCoreConfig: WarpCoreConfig = { tokens: [] };

  const tokenMetadata = await HypERC20Deployer.deriveTokenMetadata(multiProvider, warpDeployConfig);
  assert(tokenMetadata && isTokenMetadata(tokenMetadata), 'Missing required token metadata');
  const { decimals, symbol, name } = tokenMetadata;
  assert(decimals, 'Missing decimals on token metadata');

  generateTokenConfigs(warpCoreConfig, warpDeployConfig, contracts, symbol, name, decimals);

  fullyConnectTokens(warpCoreConfig);

  return warpCoreConfig;
}

/**
 * Creates token configs.
 */
function generateTokenConfigs(
  warpCoreConfig: WarpCoreConfig,
  warpDeployConfig: WarpRouteDeployConfigMailboxRequired,
  contracts: HyperlaneContractsMap<TokenFactories>,
  symbol: string,
  name: string,
  decimals: number,
): void {
  for (const [chainName, contract] of Object.entries(contracts)) {
    const config = warpDeployConfig[chainName];
    const collateralAddressOrDenom = isCollateralTokenConfig(config)
      ? config.token // gets set in the above deriveTokenMetadata()
      : undefined;

    warpCoreConfig.tokens.push({
      chainName,
      standard: TOKEN_TYPE_TO_STANDARD[config.type],
      decimals,
      symbol,
      name,
      addressOrDenom: contract[warpDeployConfig[chainName].type as keyof TokenFactories].address,
      collateralAddressOrDenom,
    });
  }
}

/**
 * Adds connections between tokens.
 * Assumes full interconnectivity between all tokens for now b.c. that's
 * what the deployers do by default.
 */
function fullyConnectTokens(warpCoreConfig: WarpCoreConfig): void {
  for (const token1 of warpCoreConfig.tokens) {
    for (const token2 of warpCoreConfig.tokens) {
      if (token1.chainName === token2.chainName && token1.addressOrDenom === token2.addressOrDenom)
        continue;
      token1.connections ||= [];
      token1.connections.push({
        token: getTokenConnectionId(
          ProtocolType.Ethereum,
          token2.chainName,
          token2.addressOrDenom!,
        ),
      });
    }
  }
}

/**
 * This attempts to halt active deployments by disabling the signers
 * in the multiProvider. This works to prevent new txs initiated from
 * the multiProvider but cannot stop txs that are 1) already in flight or
 * 2) will be sent from a signer other than the one in the multiProvider (e.g
 * an ethers Factory created a copy of the signer and uses that to send txs).
 * After several hours of experiments, I suspect this is the best we can do
 * without restructuring the SDK's deployers.
 *
 * In the event where this misses a tx or two, there's a chance the refund tx
 * will fail. Assuming the retries fail as well, a user would need to manually
 * initiate a refund later via the DeployerRecoveryModal.
 */
async function haltDeployment(
  multiProvider: MultiProvider,
  wallets: DeployerWallets,
  chains: ChainName[] = [],
) {
  logger.debug('Clearing signers from multiProvider');
  multiProvider.setSharedSigner(null);
  logger.debug('Waiting for pending txs to settle');
  await sleep(5000);
  // Wait up to NUM_SECONDS_FOR_TX_WAIT for tx to settle
  for (let i = 0; i < NUM_SECONDS_FOR_TX_WAIT; i++) {
    const results = await Promise.all(
      chains.map(async (chainName) => {
        try {
          const protocol = multiProvider.getProtocol(chainName);
          const deployer = wallets[protocol];
          if (!deployer) return false;
          return hasPendingTx(deployer, chainName, multiProvider);
        } catch (error) {
          logger.error(`Error checking pending txs on ${chainName}`, error);
          return true;
        }
      }),
    );
    if (results.some((r) => r)) sleep(1000);
    else return;
  }
  logger.warn('Timed out waiting for pending txs to settle');
}
