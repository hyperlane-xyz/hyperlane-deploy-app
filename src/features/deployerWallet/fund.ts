import { MultiProtocolProvider, Token } from '@hyperlane-xyz/sdk';
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
import { getTransferTx } from './transactions';

const USER_REJECTED_ERROR = 'User rejected';
const CHAIN_MISMATCH_ERROR = 'ChainMismatchError';

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

  const chainMetadata = multiProvider.getChainMetadata(chainName);
  const sendTransaction = transactionFns[chainMetadata.protocol].sendTransaction;
  const activeChainName = activeChains.chains[chainMetadata.protocol].chainName;
  const sender = getAccountAddressForChain(multiProvider, chainName, activeAccounts.accounts);
  if (!sender) throw new Error(`No active account found for chain ${chainName}`);

  const amount = await getFundingAmount(chainName, gasUnits, multiProvider);

  const token = Token.FromChainMetadataNativeToken(chainMetadata);
  await assertSenderBalance(sender, amount, token, multiProvider);
  const tx = await getTransferTx(deployerAddress, amount, token, multiProvider);

  try {
    const { hash, confirm } = await sendTransaction({
      tx,
      chainName,
      activeChainName,
    });
    const txReceipt = await confirm();
    logger.debug(`Deployer funding tx confirmed on ${chainName}, hash: ${hash}`);
    toastTxSuccess(`Deployer funded on ${chainName}!`, hash, origin);
    return txReceipt;
  } catch (error: any) {
    const errorDetails = error.message || error.toString();
    if (errorDetails.includes(CHAIN_MISMATCH_ERROR)) {
      throw new Error(`Wallet must be connected to ${chainName}`);
    } else if (errorDetails.includes(USER_REJECTED_ERROR)) {
      throw new Error('User rejected transaction');
    } else {
      throw error;
    }
  }
}

// TODO multi-protocol support
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
  amount: bigint,
  token: Token,
  multiProvider: MultiProtocolProvider,
) {
  const balance = await token.getBalance(multiProvider, sender);
  assert(balance.amount >= amount, 'Insufficient balance for deployment');
}
