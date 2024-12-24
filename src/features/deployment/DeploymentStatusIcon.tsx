import { ErrorIcon, SpinnerIcon } from '@hyperlane-xyz/widgets';
import { ConfirmedIcon } from '../../components/icons/ConfirmedIcon';
import { LogsIcon } from '../../components/icons/LogsIcon';
import { StopIcon } from '../../components/icons/StopIcon';
import { Color } from '../../styles/Color';
import { DeploymentStatus } from './types';

export function DeploymentStatusIcon({ status, size }: { status: DeploymentStatus; size: number }) {
  switch (status) {
    case DeploymentStatus.Configured:
      return <LogsIcon width={size - 3} height={size - 3} color={Color.primary['500']} />;
    case DeploymentStatus.Deploying:
      return <SpinnerIcon width={size} height={size} />;
    case DeploymentStatus.Complete:
      return <ConfirmedIcon width={size} height={size} color={Color.primary['500']} />;
    case DeploymentStatus.Cancelled:
      return <StopIcon width={size - 2} height={size - 2} color={Color.red['500']} />;
    case DeploymentStatus.Failed:
    default:
      return <ErrorIcon width={size} height={size} color={Color.red['500']} />;
  }
}
