import { shortenAddress } from '@hyperlane-xyz/utils';
import { Button, CopyIcon } from '@hyperlane-xyz/widgets';
import clsx from 'clsx';
import { RestartIcon } from '../../../components/icons/RestartIcon';
import { A } from '../../../components/text/A';
import { H1, H2 } from '../../../components/text/Headers';
import { links } from '../../../consts/links';
import { CardPage } from '../../../flows/CardPage';
import { useCardNav } from '../../../flows/hooks';
import { Color } from '../../../styles/Color';
import { useWarpDeploymentConfig } from '../hooks';
import { tryCopyConfig } from '../utils';

export function WarpDeploymentSuccess() {
  const { deploymentConfig, setDeploymentConfig } = useWarpDeploymentConfig();
  const firstOwner = Object.values(deploymentConfig?.config || {})[0]?.owner;
  const firstOwnerDisplay = firstOwner ? ` (${shortenAddress(firstOwner)})` : '';

  const onClickCopyConfig = () => {
    tryCopyConfig(deploymentConfig);
  };

  const { setPage } = useCardNav();
  const onClickNew = () => {
    setDeploymentConfig(undefined);
    setPage(CardPage.WarpForm);
  };

  return (
    <div className="flex w-full flex-col items-center space-y-4 py-2 text-md">
      <H1 className="text-center">Your Warp Route is Deployed!</H1>
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

      <Button onClick={onClickNew} className="gap-2.5 pt-4">
        <RestartIcon width={18} height={18} color={Color.accent['500']} />
        <span className="text-accent-500">Start a new deployment</span>
      </Button>
    </div>
  );
}

const styles = {
  link: 'underline underline-offset-2 hover:opacity-80 active:opacity-70',
};
