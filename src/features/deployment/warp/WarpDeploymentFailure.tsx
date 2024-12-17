import { RestartButton } from '../../../components/buttons/RestartButton';
import { H1 } from '../../../components/text/Headers';

export function WarpDeploymentFailure() {
  return (
    <div className="flex w-full flex-col items-center space-y-4 py-2 text-md">
      <H1 className="text-center text-red-500">Deployment has failed</H1>
      <p className="max-w-lg rounded-lg bg-blue-500/5 p-2 text-xs text-gray-800">
        Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nemo modi consequatur quod animi,
        dolorum asperiores hic molestias veniam, voluptatibus sit blanditiis eaque nostrum maxime.
        Et, voluptates. Nemo quas doloribus molestias?
      </p>
      <div>TODO refund balances</div>
      <RestartButton />
    </div>
  );
}
