import ConfirmedIcon from '../../images/icons/confirmed-icon.svg';
import DeliveredIcon from '../../images/icons/delivered-icon.svg';
import ErrorCircleIcon from '../../images/icons/error-circle.svg';
import { DeploymentStatus, FinalDeploymentStatuses, SentDeploymentStatuses } from './types';

export function getDeploymentStatusLabel(
  status: DeploymentStatus,
  connectorName: string,
  isPermissionlessRoute: boolean,
  isAccountReady: boolean,
) {
  let statusDescription = '...';
  if (!isAccountReady && !FinalDeploymentStatuses.includes(status))
    statusDescription = 'Please connect wallet to continue';
  else if (status === DeploymentStatus.Preparing) statusDescription = 'Preparing for deployment...';
  else if (status === DeploymentStatus.CreatingTxs) statusDescription = 'Creating transactions...';
  else if (status === DeploymentStatus.SigningApprove)
    statusDescription = `Sign approve transaction in ${connectorName} to continue.`;
  else if (status === DeploymentStatus.ConfirmingApprove)
    statusDescription = 'Confirming approve transaction...';
  else if (status === DeploymentStatus.SigningDeployment)
    statusDescription = `Sign deployment transaction in ${connectorName} to continue.`;
  else if (status === DeploymentStatus.ConfirmingDeployment)
    statusDescription = 'Confirming deployment transaction...';
  else if (status === DeploymentStatus.ConfirmedDeployment)
    if (!isPermissionlessRoute)
      statusDescription = 'Deployment transaction confirmed, delivering message...';
    else
      statusDescription =
        'Deployment confirmed, the funds will arrive when the message is delivered.';
  else if (status === DeploymentStatus.Delivered)
    statusDescription = 'Delivery complete, deployment successful!';
  else if (status === DeploymentStatus.Failed)
    statusDescription = 'Deployment failed, please try again.';

  return statusDescription;
}

export function isDeploymentSent(status: DeploymentStatus) {
  return SentDeploymentStatuses.includes(status);
}

export function isDeploymentFailed(status: DeploymentStatus) {
  return status === DeploymentStatus.Failed;
}

export const STATUSES_WITH_ICON = [
  DeploymentStatus.Delivered,
  DeploymentStatus.ConfirmedDeployment,
  DeploymentStatus.Failed,
];

export function getIconByDeploymentStatus(status: DeploymentStatus) {
  switch (status) {
    case DeploymentStatus.Delivered:
      return DeliveredIcon;
    case DeploymentStatus.ConfirmedDeployment:
      return ConfirmedIcon;
    case DeploymentStatus.Failed:
      return ErrorCircleIcon;
    default:
      return ErrorCircleIcon;
  }
}
