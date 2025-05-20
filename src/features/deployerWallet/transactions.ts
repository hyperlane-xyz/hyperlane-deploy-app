import {
  getChainIdNumber,
  MultiProtocolProvider,
  MultiProvider,
  ProviderType,
  Token,
  TOKEN_STANDARD_TO_PROVIDER_TYPE,
  TypedTransaction,
  TypedTransactionReceipt,
  WarpTxCategory,
  WarpTypedTransaction,
} from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { logger } from '../../utils/logger';
import { TypedWallet } from './types';

// TODO edit Widgets lib to default to TypedTransaction instead of WarpTypedTransaction?
export async function getTransferTx(
  recipient: Address,
  amount: bigint,
  token: Token,
  multiProvider: MultiProtocolProvider,
): Promise<WarpTypedTransaction> {
  const chainMetadata = multiProvider.getChainMetadata(token.chainName);

  let txParams = (await token
    .getAdapter(multiProvider)
    .populateTransferTx({ recipient, weiAmountOrId: amount })) as object;

  if (token.protocol === ProtocolType.Ethereum) {
    // Add chainId to help reduce likely of wallet signing on wrong chain
    const chainId = getChainIdNumber(chainMetadata);
    txParams = { ...txParams, chainId };
  }

  return {
    type: TOKEN_STANDARD_TO_PROVIDER_TYPE[token.standard],
    transaction: txParams,
    category: WarpTxCategory.Transfer,
  } as WarpTypedTransaction;
}

// TODO multi-protocol support
export async function sendTxFromWallet(
  typedWallet: TypedWallet,
  typedTx: TypedTransaction,
  chainName: ChainName,
  multiProvider: MultiProtocolProvider,
  gasPrice: number | bigint,
): Promise<TypedTransactionReceipt> {
  if (typedTx.type === ProviderType.EthersV5 && typedWallet.type === ProviderType.EthersV5) {
    const provider = multiProvider.getEthersV5Provider(chainName);
    const connectedWallet = typedWallet.wallet.connect(provider);

    const response = await connectedWallet.sendTransaction({
      ...typedTx.transaction,
      gasPrice,
    });
    const receipt = await response.wait();
    return {
      type: ProviderType.EthersV5,
      receipt,
    };
  } else {
    throw new Error(`Unsupported provider type for sending txs: ${typedWallet.type}`);
  }
}

// TODO multi-protocol support
export async function hasPendingTx(
  typedWallet: TypedWallet,
  chainName: ChainName,
  multiProvider: MultiProvider,
) {
  const { type, address } = typedWallet;
  let hasPending = false;
  if (type === ProviderType.EthersV5) {
    const provider = multiProvider.getProvider(chainName);
    // Based on https://github.com/ethers-io/ethers.js/discussions/3470
    // This is an imperfect way to check for pending txs but it's probably
    // the best approximation we can do. The eth_pendingTransactions may also
    // help but it's not supported by all providers.
    const [currentNonce, pendingNonce] = await Promise.all([
      provider.getTransactionCount(address),
      provider.getTransactionCount(address, 'pending'),
    ]);
    hasPending = currentNonce !== pendingNonce;
  } else {
    throw new Error(`Unsupported provider type for sending txs: ${typedWallet.type}`);
  }

  if (hasPending) {
    logger.debug(`Pending tx found for for ${address} on ${chainName}`);
    return true;
  } else {
    logger.debug(`No pending tx found for for ${address} on ${chainName}`);
    return false;
  }
}
