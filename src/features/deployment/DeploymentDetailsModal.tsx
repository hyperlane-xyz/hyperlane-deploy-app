import { ProtocolType } from '@hyperlane-xyz/utils';
import {
  CopyButton,
  Modal,
  SpinnerIcon,
  useAccountForChain,
  useTimeout,
  useWalletDetails,
} from '@hyperlane-xyz/widgets';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';
import LinkIcon from '../../images/icons/external-link-icon.svg';
import { formatTimestamp } from '../../utils/date';
import { useMultiProvider } from '../chains/hooks';
import { hasPermissionlessChain } from '../chains/utils';
import { DeploymentContext, DeploymentStatus } from './types';
import {
  getDeploymentStatusLabel,
  getIconByDeploymentStatus,
  isDeploymentFailed,
  isDeploymentSent,
} from './utils';

export function DeploymentsDetailsModal({
  isOpen,
  onClose,
  deployment,
}: {
  isOpen: boolean;
  onClose: () => void;
  deployment: DeploymentContext;
}) {
  const { status, origin, destination, timestamp } = deployment || {};

  const multiProvider = useMultiProvider();

  const isChainKnown = multiProvider.hasChain(origin);
  const account = useAccountForChain(multiProvider, isChainKnown ? origin : undefined);
  const walletDetails = useWalletDetails()[account?.protocol || ProtocolType.Ethereum];

  const isAccountReady = !!account?.isReady;
  const connectorName = walletDetails.name || 'wallet';
  const isPermissionlessRoute = hasPermissionlessChain(multiProvider, [destination, origin]);
  const isSent = isDeploymentSent(status);
  const isFailed = isDeploymentFailed(status);
  const isFinal = isSent || isFailed;
  const statusDescription = getDeploymentStatusLabel(
    status,
    connectorName,
    isPermissionlessRoute,
    isAccountReady,
  );
  const showSignWarning = useSignIssueWarning(status);

  const date = useMemo(
    () => (timestamp ? formatTimestamp(timestamp) : formatTimestamp(new Date().getTime())),
    [timestamp],
  );

  return (
    <Modal isOpen={isOpen} close={onClose} panelClassname="p-4 md:p-5 max-w-sm">
      {isFinal && (
        <div className="flex justify-between">
          <h2 className="font-medium text-gray-600">{date}</h2>
          <div className="flex items-center font-medium">
            {isSent ? (
              <h3 className="text-primary-500">Sent</h3>
            ) : (
              <h3 className="text-red-500">Failed</h3>
            )}
            <Image
              src={getIconByDeploymentStatus(status)}
              width={25}
              height={25}
              alt=""
              className="ml-2"
            />
          </div>
        </div>
      )}

      {isFinal ? (
        <div className="mt-5 flex flex-col space-y-4">TODO</div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4">
          <SpinnerIcon width={60} height={60} className="mt-3" />
          <div
            className={`mt-5 text-center text-sm ${isFailed ? 'text-red-600' : 'text-gray-600'}`}
          >
            {statusDescription}
          </div>
          {showSignWarning && (
            <div className="mt-3 text-center text-sm text-gray-600">
              If your wallet does not show a transaction request or never confirms, please try the
              deployment again.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function DeploymentProperty({
  name,
  value,
  url,
}: {
  name: string;
  value: string;
  url?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm leading-normal tracking-wider text-gray-350">{name}</label>
        <div className="flex items-center space-x-2">
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Image src={LinkIcon} width={14} height={14} alt="" />
            </a>
          )}
          <CopyButton copyValue={value} width={14} height={14} className="opacity-40" />
        </div>
      </div>
      <div className="mt-1 truncate text-sm leading-normal tracking-wider">{value}</div>
    </div>
  );
}

// https://github.com/wagmi-dev/wagmi/discussions/2928
function useSignIssueWarning(status: DeploymentStatus) {
  const [showWarning, setShowWarning] = useState(false);
  const warningCallback = useCallback(() => {
    if (
      status === DeploymentStatus.SigningDeployment ||
      status === DeploymentStatus.ConfirmingDeployment
    )
      setShowWarning(true);
  }, [status, setShowWarning]);
  useTimeout(warningCallback, 20_000);
  return showWarning;
}
