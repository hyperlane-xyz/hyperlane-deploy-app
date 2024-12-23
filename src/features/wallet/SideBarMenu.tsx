import { toTitleCase } from '@hyperlane-xyz/utils';
import { AccountList, Button, SpinnerIcon } from '@hyperlane-xyz/widgets';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import CollapseIcon from '../../images/icons/collapse-icon.svg';
import { Color } from '../../styles/Color';
import { useMultiProvider } from '../chains/hooks';
import { getChainDisplayName } from '../chains/utils';
import { DeploymentsDetailsModal } from '../deployment/DeploymentDetailsModal';
import { useDeploymentHistory } from '../deployment/hooks';
import { DeploymentContext, DeploymentStatus } from '../deployment/types';
import { getIconByDeploymentStatus } from '../deployment/utils';

export function SideBarMenu({
  onClickConnectWallet,
  isOpen,
  onClose,
}: {
  onClickConnectWallet: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const multiProvider = useMultiProvider();
  const { deployments } = useDeploymentHistory();
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentContext | null>(null);

  const sortedDeployments = useMemo(() => [...deployments].reverse(), [deployments]);

  const onCopySuccess = () => {
    toast.success('Address copied to clipboard', { autoClose: 2000 });
  };

  return (
    <>
      <div
        className={`fixed right-0 top-0 h-full w-88 transform bg-white bg-opacity-95 shadow-lg transition-transform duration-100 ease-in ${
          isOpen ? 'z-10 translate-x-0' : 'z-0 translate-x-full'
        }`}
      >
        {isOpen && (
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
              {sortedDeployments.map((t, i) => (
                <DeploymentSummary
                  key={i}
                  index={sortedDeployments.length - i}
                  deployment={t}
                  onClick={() => {
                    setSelectedDeployment(t);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {selectedDeployment && (
        <DeploymentsDetailsModal
          isOpen={!!selectedDeployment}
          onClose={() => {
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
  index,
  onClick,
}: {
  deployment: DeploymentContext;
  index: number;
  onClick: () => void;
}) {
  const { timestamp, status, type, config } = deployment;
  const Icon = getIconByDeploymentStatus(status);
  const timeDisplay = new Date(timestamp).toLocaleDateString();

  const multiProvider = useMultiProvider();
  const chainList = config.chains
    .map((c) => getChainDisplayName(multiProvider, c, true))
    .join(', ');

  // TODO create and use unique icons for each deployment type here
  return (
    <Button
      key={timestamp}
      onClick={onClick}
      className="w-full justify-between rounded-sm px-2 py-2 hover:bg-gray-200"
    >
      <div className="space-y-0.5 text-left">
        <h4 className="text-sm">{`${toTitleCase(type)} Deployment #${index} - ${timeDisplay}`}</h4>
        <p className="text-xs">{chainList}</p>
      </div>
      <div className="flex h-5 w-5">
        {status === DeploymentStatus.Deploying ? (
          <SpinnerIcon className="-ml-1 mr-3 h-5 w-5" />
        ) : (
          <Icon width={25} height={25} color={Color.primary['500']} />
        )}
      </div>
    </Button>
  );
}
