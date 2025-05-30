import { toast } from 'react-toastify';
import { useMultiProvider } from '../../features/chains/hooks';

export function toastTxSuccess(msg: string, txHash: string, chain: ChainName, autoClose = 10_000) {
  toast.success(<TxSuccessToast msg={msg} txHash={txHash} chain={chain} />, {
    autoClose,
  });
}

export function TxSuccessToast({
  msg,
  txHash,
  chain,
}: {
  msg: string;
  txHash: string;
  chain: ChainName;
}) {
  const multiProvider = useMultiProvider();
  const url = multiProvider.tryGetExplorerTxUrl(chain, { hash: txHash });

  return (
    <div>
      {msg + ' '}
      {url && (
        <a className="underline" href={url} target="_blank" rel="noopener noreferrer">
          Open in Explorer
        </a>
      )}
    </div>
  );
}
