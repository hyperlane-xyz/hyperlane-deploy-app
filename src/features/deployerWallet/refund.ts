import { MultiProtocolProvider, Token } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useMutation } from '@tanstack/react-query';
import { useToastError } from '../../components/toast/useToastError';
import { logger } from '../../utils/logger';
import { useMultiProvider } from '../chains/hooks';
import { useDeploymentChains } from '../deployment/hooks';
import { getDeployerAddressForProtocol, useTempDeployerWallets } from './hooks';
import { TempDeployerWallets } from './types';

export function useRefundDeployerAccounts({ onSuccess }: { onSuccess?: () => void }) {
  const multiProvider = useMultiProvider();
  const chains = useDeploymentChains();
  const { wallets } = useTempDeployerWallets([]);

  const { error, mutate } = useMutation({
    mutationKey: ['refundDeployerAccounts', chains, wallets],
    mutationFn: () => refundDeployerAccounts(chains, wallets, multiProvider),
    retry: 3,
    onSuccess,
  });

  useToastError(
    error,
    'Error refunding deployer balances. The key has been stored. Please try again later.',
  );

  return mutate;
}

async function refundDeployerAccounts(
  chains: ChainName[],
  wallets: TempDeployerWallets,
  multiProvider: MultiProtocolProvider,
) {
  logger.info('Refunding deployer accounts');
  const nonZeroBalances = await getDeployerBalances(chains, wallets, multiProvider);
  const txReceipts = await transferBalances(nonZeroBalances, wallets, multiProvider);
  logger.info('Done refunding deployer accounts');
  return true;
}

interface Balance {
  chainName: ChainName;
  protocol: ProtocolType;
  address: Address;
  amount: bigint;
}

async function getDeployerBalances(
  chains: ChainName[],
  wallets: TempDeployerWallets,
  multiProvider: MultiProtocolProvider,
) {
  const balances: Array<PromiseSettledResult<Balance | undefined>> = await Promise.allSettled(
    chains.map(async (chainName) => {
      const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
      const address = getDeployerAddressForProtocol(wallets, chainMetadata?.protocol);
      if (!chainMetadata || !address) return undefined;
      const token = Token.FromChainMetadataNativeToken(chainMetadata);
      logger.debug('Checking balance', chainName, address);
      const balance = await token.getBalance(multiProvider, address);
      logger.debug('Balance retrieved', chainName, address, balance.amount);
      return { chainName, protocol: chainMetadata.protocol, address, amount: balance.amount };
    }),
  );
  const nonZeroBalances = balances
    .filter((b) => b.status === 'fulfilled')
    .map((b) => b.value)
    .filter((b): b is Balance => !!b && b.amount > 0n);
  logger.debug(
    'Non-zero balances found for chains:',
    nonZeroBalances.map((b) => b.chainName),
  );
  return nonZeroBalances;
}

async function transferBalances(
  balances: Balance[],
  wallets: TempDeployerWallets,
  multiProvider: MultiProtocolProvider,
) {
  const txReceipts: Array<PromiseSettledResult<string>> = await Promise.allSettled(
    balances.map(async (balance) => {
      const { chainName, protocol, address: deployerAddress, amount } = balance;
      const chainMetadata = multiProvider.getChainMetadata(chainName);
      const token = Token.FromChainMetadataNativeToken(chainMetadata);
      logger.debug('Preparing transfer', chainName, amount);
      // TODO generalize and call getFundingTx from fund.ts
    }),
  );

  // TODO process txReceipts
}
