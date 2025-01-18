import {
  MultiProtocolProvider,
  Token,
  TypedTransaction,
  TypedTransactionReceipt,
} from '@hyperlane-xyz/sdk';
import { assert, ProtocolType } from '@hyperlane-xyz/utils';
import { AccountInfo, getAccountAddressForChain, useAccounts } from '@hyperlane-xyz/widgets';
import { useMutation } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { useToastError } from '../../components/toast/useToastError';
import { REFUND_FEE_PADDING_FACTOR } from '../../consts/consts';
import { logger } from '../../utils/logger';
import { useMultiProvider } from '../chains/hooks';
import { getChainDisplayName } from '../chains/utils';
import { usePastDeploymentChains } from '../deployment/hooks';
import { Balance, getDeployerBalances } from './balances';
import { getTransferTx, sendTxFromWallet } from './transactions';
import { DeployerWallets } from './types';
import { useDeployerWallets } from './wallets';

export function useRefundDeployerAccounts(onSettled?: () => void) {
  const multiProvider = useMultiProvider();
  const { chains } = usePastDeploymentChains();
  const { wallets } = useDeployerWallets();
  const { accounts } = useAccounts(multiProvider);

  const { error, mutate, mutateAsync, isIdle, isPending } = useMutation({
    mutationKey: ['refundDeployerAccounts', chains, accounts],
    mutationFn: () => refundDeployerAccounts(chains, wallets, multiProvider, accounts),
    retry: false,
    onSettled,
  });

  useToastError(
    error,
    'Error refunding deployer balances. The key has been stored. Please try again later.',
  );

  return {
    refund: mutate,
    refundAsync: mutateAsync,
    isIdle,
    isPending,
  };
}

async function refundDeployerAccounts(
  chains: ChainName[],
  wallets: DeployerWallets,
  multiProvider: MultiProtocolProvider,
  accounts: Record<ProtocolType, AccountInfo>,
) {
  logger.info('Refunding deployer accounts');
  const nonZeroBalances = await getDeployerBalances(chains, wallets, multiProvider);
  await transferBalances(nonZeroBalances, wallets, multiProvider, accounts);
  logger.info('Done refunding deployer accounts');
  return true;
}

async function transferBalances(
  balances: Balance[],
  wallets: DeployerWallets,
  multiProvider: MultiProtocolProvider,
  accounts: Record<ProtocolType, AccountInfo>,
) {
  const txReceipts: Array<PromiseSettledResult<TypedTransactionReceipt | undefined>> =
    await Promise.allSettled(
      balances.map(async (balance) => {
        const { chainName, protocol, amount: balanceAmount, address: deployerAddress } = balance;
        logger.debug('Preparing transfer from deployer', chainName, balanceAmount);

        try {
          const chainMetadata = multiProvider.getChainMetadata(chainName);
          const token = Token.FromChainMetadataNativeToken(chainMetadata);
          const recipient = getAccountAddressForChain(multiProvider, chainName, accounts);
          assert(recipient, `No user account found for chain ${chainName}`);
          const deployer = wallets[protocol];
          assert(deployer, `No deployer wallet found for protocol ${protocol}`);

          const estimationTx = await getTransferTx(recipient, balanceAmount, token, multiProvider);

          const adjustedAmount = await computeNetTransferAmount(
            chainName,
            estimationTx,
            balanceAmount,
            multiProvider,
            deployerAddress,
          );
          if (adjustedAmount <= 0n) return undefined;

          const tx = await getTransferTx(recipient, adjustedAmount, token, multiProvider);

          const txReceipt = await sendTxFromWallet(deployer, tx, chainName, multiProvider);
          logger.debug('Transfer tx confirmed on chain', chainName, txReceipt.receipt);
          return txReceipt;
        } catch (error) {
          const msg = `Error refunding balance on chain ${chainName}`;
          logger.error(msg, error);
          throw new Error(msg, { cause: error });
        }
      }),
    );

  const failedTransferChains = balances
    .filter((_, i) => txReceipts[i].status === 'rejected')
    .map((b) => b.chainName)
    .map((c) => getChainDisplayName(multiProvider, c));
  if (failedTransferChains.length) {
    throw new Error(
      `Failed to transfer deployer balances on chains: ${failedTransferChains.join(', ')}`,
    );
  } else {
    return txReceipts
      .filter((t) => t.status === 'fulfilled')
      .map((t) => t.value)
      .filter((t): t is TypedTransactionReceipt => !!t);
  }
}

async function computeNetTransferAmount(
  chain: ChainName,
  transaction: TypedTransaction,
  balance: bigint,
  multiProvider: MultiProtocolProvider,
  sender: Address,
) {
  const { fee } = await multiProvider.estimateTransactionFee({
    chainNameOrId: chain,
    transaction,
    sender,
  });
  logger.debug(`Estimated fee for transfer on ${chain}`, fee);
  // Using BigNumber here because BigInts don't support decimals
  const paddedFee = new BigNumber(fee.toString())
    .times(REFUND_FEE_PADDING_FACTOR)
    .decimalPlaces(0, BigNumber.ROUND_UP);
  const netAmount = new BigNumber(balance.toString()).minus(paddedFee);
  if (netAmount.gt(0)) {
    const netAmountBn = BigInt(netAmount.toFixed(0));
    logger.debug(`Net amount for transfer on ${chain}`, netAmountBn);
    return netAmountBn;
  } else {
    logger.debug(`Estimated fee is greater than balance on ${chain}`);
    return 0n;
  }
}
