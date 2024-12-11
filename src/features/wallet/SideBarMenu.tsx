import { AccountList, SpinnerIcon } from '@hyperlane-xyz/widgets';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import CollapseIcon from '../../images/icons/collapse-icon.svg';
import ResetIcon from '../../images/icons/reset-icon.svg';
import { useMultiProvider } from '../chains/hooks';
import { DeploymentsDetailsModal } from '../deployment/DeploymentDetailsModal';
import { DeploymentContext } from '../deployment/types';
import { getIconByDeploymentStatus, STATUSES_WITH_ICON } from '../deployment/utils';
import { useStore } from '../store';

export function SideBarMenu({
  onClickConnectWallet,
  isOpen,
  onClose,
}: {
  onClickConnectWallet: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const didMountRef = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentContext | null>(null);

  const multiProvider = useMultiProvider();

  const { deployments, resetDeployments, isDeploymentLoading } = useStore((s) => ({
    deployments: s.deployments,
    resetDeployments: s.resetDeployments,
    isDeploymentLoading: s.isDeploymentLoading,
  }));

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
    } else if (isDeploymentLoading) {
      setSelectedDeployment(deployments[deployments.length - 1]);
      setIsModalOpen(true);
    }
  }, [deployments, isDeploymentLoading]);

  useEffect(() => {
    setIsMenuOpen(isOpen);
  }, [isOpen]);

  const sortedDeployments = useMemo(
    () => [...deployments].sort((a, b) => b.timestamp - a.timestamp) || [],
    [deployments],
  );

  const onCopySuccess = () => {
    toast.success('Address copied to clipboard', { autoClose: 2000 });
  };

  return (
    <>
      <div
        className={`fixed right-0 top-0 h-full w-88 transform bg-white bg-opacity-95 shadow-lg transition-transform duration-100 ease-in ${
          isMenuOpen ? 'z-10 translate-x-0' : 'z-0 translate-x-full'
        }`}
      >
        {isMenuOpen && (
          <button
            className="absolute left-0 top-0 flex h-full w-9 -translate-x-full items-center justify-center rounded-l-md bg-white bg-opacity-60 transition-all hover:bg-opacity-80"
            onClick={() => onClose()}
          >
            <Image src={CollapseIcon} width={15} height={24} alt="" />
          </button>
        )}
        <div className="flex h-full w-full flex-col overflow-y-auto">
          <div className="w-full rounded-t-md bg-primary-500 px-3.5 py-2 text-base font-normal tracking-wider text-white">
            Connected Wallets
          </div>
          <AccountList
            multiProvider={multiProvider}
            onClickConnectWallet={onClickConnectWallet}
            onCopySuccess={onCopySuccess}
            className="px-3 py-3"
          />
          <div className="mb-4 w-full bg-primary-500 px-3.5 py-2 text-base font-normal tracking-wider text-white">
            Deployment History
          </div>
          <div className="flex grow flex-col px-3.5">
            <div className="flex w-full grow flex-col divide-y">
              {sortedDeployments?.length > 0 &&
                sortedDeployments.map((t, i) => (
                  <DeploymentSummary
                    key={i}
                    deployment={t}
                    onClick={() => {
                      setSelectedDeployment(t);
                      setIsModalOpen(true);
                    }}
                  />
                ))}
            </div>
            {sortedDeployments?.length > 0 && (
              <button onClick={resetDeployments} className={`${styles.btn} mx-2 my-5`}>
                <Image className="mr-4" src={ResetIcon} width={17} height={17} alt="" />
                <span className="text-sm font-normal text-gray-900">Reset deployment history</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {selectedDeployment && (
        <DeploymentsDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDeployment(null);
          }}
          deployment={selectedDeployment}
        />
      )}
    </>
  );
}

function DeploymentSummary({
  deployment,
  onClick,
}: {
  deployment: DeploymentContext;
  onClick: () => void;
}) {
  // const multiProvider = useMultiProvider();

  const { status, timestamp } = deployment;

  return (
    <button key={timestamp} onClick={onClick} className={`${styles.btn} justify-between py-3`}>
      <div>TODO</div>
      <div className="flex h-5 w-5">
        {STATUSES_WITH_ICON.includes(status) ? (
          <Image src={getIconByDeploymentStatus(status)} width={25} height={25} alt="" />
        ) : (
          <SpinnerIcon className="-ml-1 mr-3 h-5 w-5" />
        )}
      </div>
    </button>
  );
}

const styles = {
  btn: 'w-full flex items-center px-1 py-2 text-sm hover:bg-gray-200 active:scale-95 transition-all duration-500 cursor-pointer rounded-sm',
};
