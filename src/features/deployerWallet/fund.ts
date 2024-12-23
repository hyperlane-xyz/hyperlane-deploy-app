import {
  EvmNativeTokenAdapter,
  getChainIdNumber,
  MultiProtocolProvider,
  ProviderType,
  WarpTxCategory,
  WarpTypedTransaction,
} from '@hyperlane-xyz/sdk';
import { assert } from '@hyperlane-xyz/utils';
import {
  getAccountAddressForChain,
  useAccounts,
  useActiveChains,
  useTransactionFns,
} from '@hyperlane-xyz/widgets';
import { useMutation } from '@tanstack/react-query';
import { toastTxSuccess } from '../../components/toast/TxSuccessToast';
import { useToastError } from '../../components/toast/useToastError';
import { logger } from '../../utils/logger';
import { useMultiProvider } from '../chains/hooks';
import { getChainDisplayName } from '../chains/utils';

export function useFundDeployerAccount(
  chainName: ChainName,
  gasUnits: bigint,
  deployerAddress?: Address,
) {
  const multiProvider = useMultiProvider();
  const activeAccounts = useAccounts(multiProvider);
  const activeChains = useActiveChains(multiProvider);
  const transactionFns = useTransactionFns(multiProvider);

  const { isPending, mutateAsync, error } = useMutation({
    mutationKey: ['fundDeployerAccount', deployerAddress, chainName, gasUnits],
    mutationFn: () => {
      if (!deployerAddress || !chainName || !gasUnits) return Promise.resolve(null);
      return executeTransfer({
        deployerAddress,
        chainName,
        gasUnits,
        multiProvider,
        activeAccounts,
        activeChains,
        transactionFns,
      });
    },
  });

  useToastError(
    error,
    `Error funding deployer on ${getChainDisplayName(multiProvider, chainName)}`,
  );

  return {
    triggerTransaction: mutateAsync,
    isPending,
    error,
  };
}

async function executeTransfer({
  deployerAddress,
  chainName,
  gasUnits,
  multiProvider,
  activeAccounts,
  activeChains,
  transactionFns,
}: {
  deployerAddress: Address;
  chainName: ChainName;
  gasUnits: bigint;
  multiProvider: MultiProtocolProvider;
  activeAccounts: ReturnType<typeof useAccounts>;
  activeChains: ReturnType<typeof useActiveChains>;
  transactionFns: ReturnType<typeof useTransactionFns>;
}) {
  logger.debug('Preparing to fund deployer', deployerAddress, chainName);

  const protocol = multiProvider.getProtocol(chainName);
  const sendTransaction = transactionFns[protocol].sendTransaction;
  const activeChainName = activeChains.chains[protocol].chainName;
  const sender = getAccountAddressForChain(multiProvider, chainName, activeAccounts.accounts);
  if (!sender) throw new Error(`No active account found for chain ${chainName}`);

  const amount = await getFundingAmount(chainName, gasUnits, multiProvider);
  await assertSenderBalance(sender, chainName, amount, multiProvider);
  const tx = await getFundingTx(deployerAddress, chainName, amount, multiProvider);
  const { hash, confirm } = await sendTransaction({
    tx,
    chainName,
    activeChainName,
  });

  const txReceipt = await confirm();
  logger.debug(`Deployer funding tx confirmed on ${chainName}, hash: ${hash}`);
  toastTxSuccess(`Deployer funded on ${chainName}!`, hash, origin);
  return txReceipt;
}

async function getFundingAmount(
  chainName: ChainName,
  gasUnits: bigint,
  multiProvider: MultiProtocolProvider,
) {
  const provider = multiProvider.getViemProvider(chainName);
  const gasPrice = await provider.getGasPrice();
  return gasUnits * gasPrice;
}

async function assertSenderBalance(
  sender: Address,
  chainName: ChainName,
  amount: bigint,
  multiProvider: MultiProtocolProvider,
) {
  const adapter = new EvmNativeTokenAdapter(chainName, multiProvider, {});
  const balance = await adapter.getBalance(sender);
  assert(balance >= amount, 'Insufficient balance for deployment');
}

// TODO edit Widgets lib to default to TypedTransaction instead of WarpTypedTransaction?
async function getFundingTx(
  recipient: Address,
  chainName: ChainName,
  amount: bigint,
  multiProvider: MultiProtocolProvider,
): Promise<WarpTypedTransaction> {
  const adapter = new EvmNativeTokenAdapter(chainName, multiProvider, {});
  const tx = await adapter.populateTransferTx({ recipient, weiAmountOrId: amount });
  // Add chainId to help reduce likely of wallet signing on wrong chain
  const chainId = getChainIdNumber(multiProvider.getChainMetadata(chainName));
  // TODO remove data when widgets lib is updated
  const txParams = { ...tx, chainId, data: '0x' };
  return {
    type: ProviderType.EthersV5,
    transaction: txParams,
    category: WarpTxCategory.Transfer,
  };
}
