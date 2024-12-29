import { MultiProtocolProvider, Token } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useQuery } from '@tanstack/react-query';
import { logger } from '../../utils/logger';
import { useMultiProvider } from '../chains/hooks';
import { useDeploymentChains } from '../deployment/hooks';
import { DeployerWallets } from './types';

export interface Balance {
  chainName: ChainName;
  protocol: ProtocolType;
  address: Address;
  amount: bigint;
}

export function useDeployerBalances(wallets: DeployerWallets) {
  const multiProvider = useMultiProvider();
  const { chains } = useDeploymentChains();

  const { data, isFetching, refetch } = useQuery({
    // MultiProvider cannot be used here because it's not serializable
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['getDeployerBalances', chains, wallets],
    queryFn: () => getDeployerBalances(chains, wallets, multiProvider),
    retry: 3,
    staleTime: 10_000,
  });

  return {
    isFetching,
    balances: data,
    refetch,
  };
}

export async function getDeployerBalances(
  chains: ChainName[],
  wallets: DeployerWallets,
  multiProvider: MultiProtocolProvider,
) {
  const balances: Array<PromiseSettledResult<Balance | undefined>> = await Promise.allSettled(
    chains.map(async (chainName) => {
      try {
        const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
        if (!chainMetadata) return undefined;
        const address = wallets[chainMetadata.protocol]?.address;
        if (!address) return undefined;
        const token = Token.FromChainMetadataNativeToken(chainMetadata);
        logger.debug('Checking balance', chainName, address);
        const balance = await token.getBalance(multiProvider, address);
        logger.debug('Balance retrieved', chainName, address, balance.amount);
        return { chainName, protocol: chainMetadata.protocol, address, amount: balance.amount };
      } catch (error: unknown) {
        const msg = `Error getting balance for chain ${chainName}`;
        logger.error(msg, error);
        throw new Error(msg, { cause: error });
      }
    }),
  );

  const nonZeroBalances = balances
    .filter((b) => b.status === 'fulfilled')
    .map((b) => b.value)
    .filter((b): b is Balance => !!b && b.amount > 0n);
  if (nonZeroBalances.length) {
    logger.debug(
      'Non-zero balances found for chains:',
      nonZeroBalances.map((b) => b.chainName).join(', '),
    );
  }

  return nonZeroBalances;
}
