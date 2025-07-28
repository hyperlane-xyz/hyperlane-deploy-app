import { BaseRegistry } from '@hyperlane-xyz/registry';
import { TOKEN_COLLATERALIZED_STANDARDS } from '@hyperlane-xyz/sdk';
import { shortenAddress } from '@hyperlane-xyz/utils';
import { CopyIcon, useModal } from '@hyperlane-xyz/widgets';
import clsx from 'clsx';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';
import { RestartButton } from '../../../components/buttons/RestartButton';
import { A } from '../../../components/text/A';
import { H1, H2 } from '../../../components/text/Headers';
import { links } from '../../../consts/links';
import DownloadIcon from '../../../images/icons/download-icon.svg';
import FolderCodeIcon from '../../../images/icons/folder-code-icon.svg';
import { Color } from '../../../styles/Color';
import { CoinGeckoConfirmationModal } from '../CoinGeckoConfirmationModal';
import { CreateRegistryPrModal } from '../CreateRegistryPrModal';
import { useCreateWarpRoutePR } from '../github';
import { useDeploymentHistory, useLatestDeployment, useWarpDeploymentConfig } from '../hooks';
import { DeploymentType } from '../types';
import { downloadYamlFile, getConfigsFilename, sortWarpCoreConfig, tryCopyConfig } from '../utils';
import { CoinGeckoFormValues } from './types';
import { isSyntheticTokenType } from './utils';

export function WarpDeploymentSuccess() {
  const { deploymentConfig } = useWarpDeploymentConfig();
  const { updateDeployment, currentIndex } = useDeploymentHistory();
  const { close, isOpen, open } = useModal();
  const { close: closeCreatePr, isOpen: isCreatePrOpen, open: openCreatePr } = useModal();
  const [hasSubmittedPr, setHasSubmittedPr] = useState(false);

  const onPrCreationSuccess = useCallback(() => setHasSubmittedPr(true), []);

  const { mutate, isPending, data: createPrData } = useCreateWarpRoutePR(onPrCreationSuccess);

  const firstOwner = Object.values(deploymentConfig?.config || {})[0]?.owner;
  const firstOwnerDisplay = firstOwner ? ` (${shortenAddress(firstOwner)})` : '';

  const deploymentContext = useLatestDeployment();

  const warpRouteId = useMemo(() => {
    if (!deploymentContext.config?.config || deploymentContext.config.type !== DeploymentType.Warp)
      return undefined;
    const deployConfig = deploymentContext.config.config;
    const firstNonSynthetic = Object.values(deployConfig).find(
      (c) => !isSyntheticTokenType(c.type),
    );

    if (!firstNonSynthetic || !firstNonSynthetic.symbol) return undefined;
    const symbol = firstNonSynthetic.symbol;

    return BaseRegistry.warpDeployConfigToId(deployConfig, { symbol });
  }, [deploymentContext]);

  const onClickCopyConfig = () =>
    tryCopyConfig(sortWarpCoreConfig(deploymentContext?.result?.result));
  const onClickCopyDeployConfig = () => tryCopyConfig(deploymentContext?.config.config);

  const downloadDeployConfig = () => {
    if (!warpRouteId) return;

    const deployConfigResult = deploymentContext.config.config;
    const { deployConfigFilename } = getConfigsFilename(warpRouteId);
    downloadYamlFile(deployConfigResult, deployConfigFilename);
  };

  const downloadWarpConfig = () => {
    if (!warpRouteId) return;
    if (!deploymentContext?.result?.result || deploymentContext.result.type !== DeploymentType.Warp)
      return;

    const warpConfigResult = sortWarpCoreConfig(deploymentContext.result.result);
    if (!warpConfigResult) return;

    const { warpConfigFilename } = getConfigsFilename(warpRouteId);
    downloadYamlFile(warpConfigResult, warpConfigFilename);
  };

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

    close();
  };

  return (
    <>
      <div className="flex w-full flex-col items-center space-y-4 py-2 text-md">
        <H1 className="text-center">Your Warp Route is Ready!</H1>
        <p className="max-w-lg text-center leading-relaxed">
          You can now use your route to{' '}
          <A className={styles.link} href={links.warpTransferDocs}>
            transfer
          </A>{' '}
          tokens across chains. Remaining funds in the deployer have been refunded.
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
            3.{' '}
            <button
              className={clsx(styles.link, 'inline-flex items-center gap-1.5')}
              onClick={onClickCopyDeployConfig}
            >
              <span> Copy </span>
              <CopyIcon width={12} height={12} color={Color.black} />
            </button>{' '}
            or{' '}
            <button
              className={clsx(styles.link, 'inline-flex items-center')}
              onClick={downloadDeployConfig}
            >
              <span> download </span>
              <Image src={DownloadIcon} width={20} height={20} alt="download-icon" />
            </button>{' '}
            your Warp Deploy Config and{' '}
            <button
              className={clsx(styles.link, 'inline-flex items-center gap-1.5')}
              onClick={onClickCopyConfig}
            >
              <span> copy </span>
              <CopyIcon width={12} height={12} color={Color.black} />
            </button>{' '}
            or{' '}
            <button
              className={clsx(styles.link, 'inline-flex items-center')}
              onClick={downloadWarpConfig}
            >
              <span> download </span>
              <Image src={DownloadIcon} width={20} height={20} alt="download-icon" />
            </button>{' '}
            your Warp Route Config.
          </li>
          <li>
            4. Add your route to the{' '}
            <A className={styles.link} href={links.registry}>
              Hyperlane Registry
            </A>{' '}
            , email your Warp configs to{' '}
            <A className={styles.link} href={`mailto:${links.ecosystemEmail}`}>
              {links.ecosystemEmail}
            </A>{' '}
            or you can open a PR by clicking{' '}
            <button
              className={clsx(styles.link, 'inline-flex items-center gap-1')}
              onClick={openCreatePr}
            >
              <span> here </span>
              <Image src={FolderCodeIcon} width={20} height={20} alt="download-icon" />
            </button>
          </li>
        </ol>

        <RestartButton className="pt-4" />
      </div>
      <CoinGeckoConfirmationModal
        isOpen={isOpen}
        onCancel={onCancelCoinGeckoId}
        onSubmit={onConfirmCoinGeckoId}
        close={close}
      />
      <CreateRegistryPrModal
        isOpen={isCreatePrOpen}
        onCancel={closeCreatePr}
        onConfirm={mutate}
        confirmDisabled={hasSubmittedPr}
        disabled={isPending}
        response={createPrData}
      />
    </>
  );
}

const styles = {
  link: 'underline underline-offset-2 hover:opacity-80 active:opacity-70',
};
