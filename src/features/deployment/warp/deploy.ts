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
  MultiProtocolProvider,
  MultiProvider,
  TOKEN_TYPE_TO_STANDARD,
  TokenFactories,
  WarpCoreConfig,
  WarpRouteDeployConfig,
  getTokenConnectionId,
  isCollateralTokenConfig,
  isTokenMetadata,
} from '@hyperlane-xyz/sdk';
import { Address, ProtocolType, assert, objMap, promiseObjAll } from '@hyperlane-xyz/utils';

export function useWarpDeployment(
  deploymentConfig?: WarpDeploymentConfig,
  onSuccess?: (config: WarpCoreConfig) => void,
  onFailure?: (error: Error) => void,
) {
  const multiProvider = useMultiProvider();
  const { wallets } = useDeployerWallets();

  const { error, mutate, isIdle, isPending } = useMutation({
    mutationKey: ['warpDeploy', deploymentConfig, wallets],
    mutationFn: () => executeDeploy(multiProvider, wallets, deploymentConfig),
    retry: false,
    onError: onFailure,
    onSuccess,
  });

  useToastError(error, 'Error deploying warp route.');

  return {
    deploy: mutate,
    isIdle,
    isPending,
  };
}

// TODO multi-protocol support
export async function executeDeploy(
  multiProtocolProvider: MultiProtocolProvider,
  wallets: DeployerWallets,
  typedConfig?: WarpDeploymentConfig,
): Promise<WarpCoreConfig> {
  assert(typedConfig, 'Warp deployment config is required');
  logger.info('Executing warp route deployment');

  const deploymentConfig = typedConfig.config;
  const multiProvider = multiProtocolProvider.toMultiProvider();
  // TODO connect wallets to MP

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
  deployConfig: WarpRouteDeployConfig,
  multiProvider: MultiProvider,
  ismFactoryDeployer: HyperlaneProxyFactoryDeployer,
  contractVerifier?: ContractVerifier,
): Promise<WarpRouteDeployConfig> {
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
  warpDeployConfig: WarpRouteDeployConfig,
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
  warpDeployConfig: WarpRouteDeployConfig,
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
