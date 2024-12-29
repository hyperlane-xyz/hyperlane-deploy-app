import { Button, CopyButton, Modal, SpinnerIcon, tryClipboardSet } from '@hyperlane-xyz/widgets';
import { PropsWithChildren, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { H2 } from '../../components/text/Headers';
import { MIN_DEPLOYER_BALANCE_TO_SHOW } from '../../consts/consts';
import { Color } from '../../styles/Color';
import { useMultiProvider } from '../chains/hooks';
import { getChainDisplayName } from '../chains/utils';
import { useDeployerBalances } from './balances';
import { useRefundDeployerAccounts } from './refund';
import { DeployerWallets, TypedWallet } from './types';
import { getDeployerWalletKey, useDeployerWallets, useRemoveDeployerWallet } from './wallets';

export function DeployerRecoveryModal({ isOpen, close }: { isOpen: boolean; close: () => void }) {
  const { wallets } = useDeployerWallets();

  // Close modal when no wallets are found
  useEffect(() => {
    if (isOpen && !Object.values(wallets).length) close();
  }, [isOpen, wallets, close]);

  return (
    <Modal isOpen={isOpen} close={close} panelClassname="p-4 flex flex-col items-center gap-4">
      <H2>Temporary Deployer Accounts</H2>
      <p className="text-center text-sm text-gray-700">
        Once the balances are successfully refunded, these temporary accounts can be safely deleted.
      </p>
      <AccountList wallets={wallets} />
      <div className="py-2">
        <Balances isOpen={isOpen} wallets={wallets} />
      </div>
    </Modal>
  );
}

function AccountList({ wallets }: { wallets: DeployerWallets }) {
  const removeDeployerKey = useRemoveDeployerWallet();

  const walletList = useMemo(() => Object.values(wallets), [wallets]);

  const onClickCopyPrivateKey = (wallet: TypedWallet) => {
    try {
      const pk = getDeployerWalletKey(wallet);
      tryClipboardSet(pk);
      toast.success('Private key copied to clipboard');
    } catch {
      toast.error('Unable to retrieve private key');
    }
  };

  const onClickDeleteAccount = (wallet: TypedWallet) => {
    removeDeployerKey(wallet.protocol);
  };

  return (
    <>
      {walletList.map((w) => (
        <div key={w.type} className="space-y-2 rounded-lg bg-primary-500/5 p-2">
          <div className="flex items-center gap-2">
            <span className="text-xs">{w.address}</span>
            <CopyButton copyValue={w.address} width={12} height={12} className="opacity-50" />
          </div>
          <div className="flex items-center justify-center gap-10 text-sm text-accent-500">
            <Button onClick={() => onClickCopyPrivateKey(w)}>Copy Private Key</Button>
            <Button onClick={() => onClickDeleteAccount(w)}>Delete Account</Button>
          </div>
        </div>
      ))}
    </>
  );
}

function Balances({ isOpen, wallets }: { isOpen: boolean; wallets: DeployerWallets }) {
  const multiProvider = useMultiProvider();
  const { balances, isFetching, refetch } = useDeployerBalances(wallets);
  const { refund, isPending } = useRefundDeployerAccounts(refetch);

  // Refetch balances when modal is opened
  useEffect(() => {
    if (isOpen) refetch();
  }, [isOpen, refetch]);

  if (isFetching || !balances) {
    return <BalanceSpinner>Searching for balances...</BalanceSpinner>;
  }

  if (isPending) {
    return <BalanceSpinner>Refunding balances...</BalanceSpinner>;
  }

  const nonTrivialBalances = balances.filter((b) => b.amount >= MIN_DEPLOYER_BALANCE_TO_SHOW);
  const balanceChains = nonTrivialBalances
    .map((b) => getChainDisplayName(multiProvider, b.chainName))
    .join(', ');

  if (!nonTrivialBalances.length) {
    return <div className="text-sm">No balances found on deployment chains</div>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm">{`Balances on found on chains: ${balanceChains}`}</span>
      <Button onClick={() => refund()} className="text-sm text-accent-500">
        Refund balances
      </Button>
    </div>
  );
}

function BalanceSpinner({ children }: PropsWithChildren<unknown>) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <SpinnerIcon width={30} height={30} color={Color.primary['500']} />
      <span className="text-sm text-gray-700">{children}</span>
    </div>
  );
}
