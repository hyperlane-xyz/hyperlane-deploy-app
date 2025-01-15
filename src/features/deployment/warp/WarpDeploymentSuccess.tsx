import { shortenAddress } from '@hyperlane-xyz/utils';
import { CopyIcon } from '@hyperlane-xyz/widgets';
import clsx from 'clsx';
import { RestartButton } from '../../../components/buttons/RestartButton';
import { A } from '../../../components/text/A';
import { H1, H2 } from '../../../components/text/Headers';
import { links } from '../../../consts/links';
import { Color } from '../../../styles/Color';
import { useLatestDeployment, useWarpDeploymentConfig } from '../hooks';
import { tryCopyConfig } from '../utils';

export function WarpDeploymentSuccess() {
  const { deploymentConfig } = useWarpDeploymentConfig();
  const firstOwner = Object.values(deploymentConfig?.config || {})[0]?.owner;
  const firstOwnerDisplay = firstOwner ? ` (${shortenAddress(firstOwner)})` : '';

  const deploymentContext = useLatestDeployment();
  const onClickCopyConfig = () => tryCopyConfig(deploymentContext?.result?.result);

  return (
    <div className="flex w-full flex-col items-center space-y-4 py-2 text-md">
      <H1 className="text-center">Your Warp Route is Ready!</H1>
      <p className="max-w-lg text-center leading-relaxed">
        You can now use your route to transfer tokens across chains. Remaining funds in the deployer
        have been refunded.
      </p>
      <H2>Next Steps:</H2>
      <ol className="space-y-4">
        <li>{`1. Protect your route owner accounts ${firstOwnerDisplay}`}</li>
        <li>
          2. Copy and save your{' '}
          <button
            className={clsx(styles.link, 'inline-flex items-center gap-1.5')}
            onClick={onClickCopyConfig}
          >
            <span>Warp Route config</span>
            <CopyIcon width={12} height={12} color={Color.black} />
          </button>
        </li>
        <li>
          3. Add your route to the{' '}
          <A className={styles.link} href={links.registry}>
            Hyperlane Registry
          </A>
        </li>
        <li>
          4.{' '}
          <A className={styles.link} href={links.warpUiDocs}>
            Setup a DApp
          </A>{' '}
          for users to make transfers
        </li>
      </ol>

      <RestartButton className="pt-4" />
    </div>
  );
}

const styles = {
  link: 'underline underline-offset-2 hover:opacity-80 active:opacity-70',
};
