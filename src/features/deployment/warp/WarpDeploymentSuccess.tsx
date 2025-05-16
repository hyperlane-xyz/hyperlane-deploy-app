import { TOKEN_COLLATERALIZED_STANDARDS } from '@hyperlane-xyz/sdk';
import { shortenAddress } from '@hyperlane-xyz/utils';
import { CopyIcon, useModal } from '@hyperlane-xyz/widgets';
import clsx from 'clsx';
import { RestartButton } from '../../../components/buttons/RestartButton';
import { A } from '../../../components/text/A';
import { H1, H2 } from '../../../components/text/Headers';
import { links } from '../../../consts/links';
import { Color } from '../../../styles/Color';
import { CoinGeckoConfirmationModal } from '../CoinGeckoConfirmationModal';
import { useDeploymentHistory, useLatestDeployment, useWarpDeploymentConfig } from '../hooks';
import { DeploymentType } from '../types';
import { tryCopyConfig } from '../utils';
import { CoinGeckoFormValues } from './types';

export function WarpDeploymentSuccess() {
  const { deploymentConfig } = useWarpDeploymentConfig();
  const { updateDeployment, currentIndex } = useDeploymentHistory();
  const { close, isOpen, open } = useModal();
  const firstOwner = Object.values(deploymentConfig?.config || {})[0]?.owner;
  const firstOwnerDisplay = firstOwner ? ` (${shortenAddress(firstOwner)})` : '';

  const deploymentContext = useLatestDeployment();
  const onClickCopyConfig = () => tryCopyConfig(deploymentContext?.result?.result);
  const onClickCopyDeployConfig = () => tryCopyConfig(deploymentContext?.config.config);

  const onCancelCoinGeckoId = () => {
    if (deploymentContext.result?.type === DeploymentType.Warp) {
      const result = deploymentContext.result.result;
      const tokens = result.tokens.map((token) => ({
        ...token,
        coinGeckoId: undefined,
      }));
      updateDeployment(currentIndex, {
        result: { type: DeploymentType.Warp, result: { ...result, tokens } },
      });
    }
    close();
  };

  const onConfirmCoinGeckoId = (values: CoinGeckoFormValues) => {
    if (deploymentContext.result?.type === DeploymentType.Warp) {
      const result = deploymentContext.result.result;
      const tokens = result.tokens;
      const hasCollaterizedTokens = tokens.some((token) =>
        TOKEN_COLLATERALIZED_STANDARDS.includes(token.standard),
      );

      // update core config if at least one token is collaterized
      if (hasCollaterizedTokens) {
        const tokensWithCoinGeckoId = tokens.map((token) => {
          if (TOKEN_COLLATERALIZED_STANDARDS.includes(token.standard))
            return { ...token, coinGeckoId: values.coinGeckoId };
          return token;
        });
        updateDeployment(currentIndex, {
          result: {
            type: DeploymentType.Warp,
            result: { ...result, tokens: tokensWithCoinGeckoId },
          },
        });
      }
    }

    close();
  };

  return (
    <>
      <div className="flex w-full flex-col items-center space-y-4 py-2 text-md">
        <H1 className="text-center">Your Warp Route is Ready!</H1>
        <p className="max-w-lg text-center leading-relaxed">
          You can now use your route to transfer tokens across chains. Remaining funds in the
          deployer have been refunded.
        </p>
        <H2>Next Steps:</H2>
        <ol className="max-w-sm space-y-4">
          <li>{`1. Protect your route owner accounts ${firstOwnerDisplay}`}</li>
          <li>
            2. Include a{' '}
            <button
              className={clsx(styles.link, 'inline-flex items-center gap-1.5')}
              onClick={open}
            >
              <span>coinGeckoId </span>
              <CopyIcon width={12} height={12} color={Color.black} />
            </button>{' '}
            in your deployment config.
          </li>
          <li>
            3. Copy and save your{' '}
            <button
              className={clsx(styles.link, 'inline-flex items-center gap-1.5')}
              onClick={onClickCopyDeployConfig}
            >
              <span>Warp Deploy config </span>
              <CopyIcon width={12} height={12} color={Color.black} />
            </button>{' '}
            and{' '}
            <button
              className={clsx(styles.link, 'inline-flex items-center gap-1.5')}
              onClick={onClickCopyConfig}
            >
              <span> Warp Route config </span>
              <CopyIcon width={12} height={12} color={Color.black} />
            </button>
          </li>
          <li>
            4. Add your route to the{' '}
            <A className={styles.link} href={links.registry}>
              Hyperlane Registry
            </A>
          </li>
          <li>
            5.{' '}
            <A className={styles.link} href={links.warpUiDocs}>
              Setup a DApp
            </A>{' '}
            for users to make transfers
          </li>
        </ol>

        <RestartButton className="pt-4" />
      </div>
      <CoinGeckoConfirmationModal
        isOpen={isOpen}
        onCancel={onCancelCoinGeckoId}
        onSubmit={onConfirmCoinGeckoId}
      />
    </>
  );
}

const styles = {
  link: 'underline underline-offset-2 hover:opacity-80 active:opacity-70',
};
