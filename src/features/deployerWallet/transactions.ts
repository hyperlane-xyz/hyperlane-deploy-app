import {
  getChainIdNumber,
  MultiProtocolProvider,
  ProviderType,
  Token,
  TypedTransaction,
  TypedTransactionReceipt,
  WarpTxCategory,
  WarpTypedTransaction,
} from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
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
    // TODO remove data when widgets lib is updated
    txParams = { ...txParams, chainId, data: '0x' };
  }

  return {
    // TODO use TOKEN_STANDARD_TO_PROVIDER_TYPE here when it's exported from the SDK
    // type: TOKEN_STANDARD_TO_PROVIDER_TYPE[token.standard],
    type: ProviderType.EthersV5,
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
): Promise<TypedTransactionReceipt> {
  if (typedTx.type === ProviderType.EthersV5 && typedWallet.type === ProviderType.EthersV5) {
    const provider = multiProvider.getEthersV5Provider(chainName);
    const response = await typedWallet.wallet
      .connect(provider)
      .sendTransaction(typedTx.transaction);
    const receipt = await response.wait();
    return {
      type: ProviderType.EthersV5,
      receipt,
    };
  } else {
    throw new Error(`Unsupported provider type for sending txs: ${typedWallet.type}`);
  }
}
