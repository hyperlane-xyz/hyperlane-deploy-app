// TODO: Most of this file has bee copied from the CLI's /src/deploy/warp.ts
// Long-term, both should be replaced by EvmERC20WarpModule when it's ready for prod
import { chainAddresses as registryChainAddresses } from '@hyperlane-xyz/registry';
import {
  ChainMap,
  EVM_TOKEN_TYPE_TO_STANDARD,
  HypERC20Deployer,
  HyperlaneContractsMap,
  MultiProvider,
  ProviderType,
  TokenFactories,
  TokenMetadataMap,
  WarpCoreConfig,
  WarpRouteDeployConfigMailboxRequired,
  executeWarpDeploy,
  getTokenConnectionId,
  isCollateralTokenConfig,
  isXERC20TokenConfig,
} from '@hyperlane-xyz/sdk';
import { ProtocolType, assert, objMap, sleep } from '@hyperlane-xyz/utils';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useToastError } from '../../../components/toast/useToastError';
import { logger } from '../../../utils/logger';
import { useMultiProvider } from '../../chains/hooks';
import { hasPendingTx } from '../../deployerWallet/transactions';
import { DeployerWallets } from '../../deployerWallet/types';
import { useDeployerWallets } from '../../deployerWallet/wallets';
import { useStore } from '../../store';
import { WarpDeploymentConfig } from '../types';

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
  const apiKeys = useStore((s) => s.apiKeys);
  const { wallets } = useDeployerWallets();

  const { error, mutate, isIdle, isPending } = useMutation({
    mutationKey: ['warpDeploy', deploymentConfig, wallets],
    mutationFn: () => {
      setIsCancelled(false);
      return executeDeploy(multiProvider, wallets, apiKeys, deploymentConfig);
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
  apiKeys: ChainMap<string>,
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

  const deployedContracts = await executeWarpDeploy(
    multiProvider,
    deploymentConfig,
    registryChainAddresses,
    apiKeys,
  );

  const warpCoreConfig = await getWarpCoreConfig(
    multiProvider,
    deploymentConfig,
    deployedContracts,
  );

  logger.info('Done warp route deployment');
  return warpCoreConfig;
}

async function getWarpCoreConfig(
  multiProvider: MultiProvider,
  warpDeployConfig: WarpRouteDeployConfigMailboxRequired,
  contracts: HyperlaneContractsMap<TokenFactories>,
): Promise<WarpCoreConfig> {
  const warpCoreConfig: WarpCoreConfig = { tokens: [] };

  const tokenMetadataMap: TokenMetadataMap = await HypERC20Deployer.deriveTokenMetadata(
    multiProvider,
    warpDeployConfig,
  );

  generateTokenConfigs(warpCoreConfig, warpDeployConfig, contracts, tokenMetadataMap);

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
  tokenMetadataMap: TokenMetadataMap,
): void {
  for (const [chainName, contract] of Object.entries(contracts)) {
    const config = warpDeployConfig[chainName];
    const collateralAddressOrDenom =
      isCollateralTokenConfig(config) || isXERC20TokenConfig(config)
        ? config.token // gets set in the above deriveTokenMetadata()
        : undefined;

    const decimals: number | undefined = tokenMetadataMap.getDecimals(chainName);
    const name = tokenMetadataMap.getName(chainName);
    const symbol = tokenMetadataMap.getSymbol(chainName);

    assert(decimals, `Decimals for ${chainName} doesn't exist`);
    assert(name, `Token name for ${chainName} doesn't exist in config`);

    warpCoreConfig.tokens.push({
      chainName,
      standard: EVM_TOKEN_TYPE_TO_STANDARD[config.type],
      decimals,
      symbol: config.symbol || symbol,
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
