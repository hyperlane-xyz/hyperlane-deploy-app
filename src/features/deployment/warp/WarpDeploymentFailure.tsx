import { Button, useModal } from '@hyperlane-xyz/widgets';
import { RestartButton } from '../../../components/buttons/RestartButton';
import { LogsIcon } from '../../../components/icons/LogsIcon';
import { H1 } from '../../../components/text/Headers';
import { Color } from '../../../styles/Color';
import { LogModal } from '../../logs/LogModal';
import { useLatestDeployment } from '../hooks';

export function WarpDeploymentFailure() {
  const deploymentContext = useLatestDeployment();
  const errorMsg = deploymentContext?.error || 'Unknown error';

  const { isOpen, open, close } = useModal();

  return (
    <div className="flex w-full flex-col items-center space-y-4 py-2 text-md">
      <H1 className="text-center text-red-500">Deployment has failed</H1>
      <p className="max-w-lg rounded-lg bg-blue-500/5 p-2 text-xs text-gray-800">{errorMsg}</p>
      <Button onClick={open} className="gap-2.5">
        <LogsIcon width={14} height={14} color={Color.accent['500']} />
        <span className="text-md text-accent-500">View deployment logs</span>
      </Button>
      <LogModal isOpen={isOpen} close={close} />
      <RestartButton />
    </div>
  );
}
