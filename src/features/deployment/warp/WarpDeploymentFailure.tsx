import { RestartButton } from '../../../components/buttons/RestartButton';
import { H1 } from '../../../components/text/Headers';
import { useLatestDeployment } from '../hooks';

export function WarpDeploymentFailure() {
  const deploymentContext = useLatestDeployment();

  const errorMsg = deploymentContext?.error || 'Unknown error';

  return (
    <div className="flex w-full flex-col items-center space-y-4 py-2 text-md">
      <H1 className="text-center text-red-500">Deployment has failed</H1>
      <p className="max-w-lg rounded-lg bg-blue-500/5 p-2 text-xs text-gray-800">{errorMsg}</p>
      <RestartButton />
    </div>
  );
}
