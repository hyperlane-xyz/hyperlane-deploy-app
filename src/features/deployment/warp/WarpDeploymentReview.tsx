import { MultiProtocolProvider, WarpRouteDeployConfig } from '@hyperlane-xyz/sdk';
import { objLength } from '@hyperlane-xyz/utils';
import Image from 'next/image';
import { BackButton } from '../../../components/buttons/BackButton';
import { SolidButton } from '../../../components/buttons/SolidButton';
import { H1 } from '../../../components/text/H1';
import { CardPage } from '../../../flows/CardPage';
import { useCardNav } from '../../../flows/hooks';
import { Stepper } from '../../../flows/Stepper';
import RocketIcon from '../../../images/icons/rocket.svg';
import { useMultiProvider } from '../../chains/hooks';
import { useStore } from '../../store';
import { DeploymentType, WarpDeploymentConfig } from '../types';
// TODO move to widgets lib
import { tryClipboardSet } from '@hyperlane-xyz/widgets';
import { toast } from 'react-toastify';
import { stringify } from 'yaml';
import { A } from '../../../components/text/A';
import { links } from '../../../consts/links';
import InfoCircle from '../../../images/icons/info-circle.svg';
import { getChainDisplayName } from '../../chains/utils';
import { TokenTypeDescriptions } from './TokenTypeSelectField';

export function WarpDeploymentReview() {
  const { deploymentConfig } = useStore((s) => ({ deploymentConfig: s.deploymentConfig }));
  if (!deploymentConfig || deploymentConfig.type !== DeploymentType.Warp) return null;

  return (
    <div className="flex w-full flex-col items-stretch xs:min-w-112 sm:min-w-128">
      <div className="space-y-5">
        <HeaderSection />
        <ConfigSection deploymentConfig={deploymentConfig} />
        <InfoSection deploymentConfig={deploymentConfig} />
        <ButtonSection />
      </div>
    </div>
  );
}

function HeaderSection() {
  return (
    <div className="flex items-center justify-between gap-10">
      <H1>Review Deployment</H1>
      <Stepper numSteps={5} currentStep={3} />
    </div>
  );
}

function ConfigSection({ deploymentConfig }: { deploymentConfig: WarpDeploymentConfig }) {
  const multiProvider = useMultiProvider();

  const { chains, config } = deploymentConfig;
  return (
    <div className="space-y-3">
      {chains.map((c, i) => (
        <ConfigItem key={c} chain={c} index={i} warpConfig={config} multiProvider={multiProvider} />
      ))}
    </div>
  );
}

function ConfigItem({
  chain,
  index,
  warpConfig,
  multiProvider,
}: {
  chain: ChainName;
  index: number;
  warpConfig: WarpRouteDeployConfig;
  multiProvider: MultiProtocolProvider;
}) {
  const config = warpConfig[chain];
  const numConfigs = objLength(warpConfig);

  const chainDisplay = getChainDisplayName(multiProvider, chain, true);
  const typeDisplay = TokenTypeDescriptions[config.type].label;

  // Cast here to workaround cumbersome discriminated union with many different cases
  const tokenAddress = (config as any).token;

  return (
    <div className="space-y-1.5 rounded-lg bg-blue-500/5 px-3 py-2">
      <h3 className="text-xs font-medium text-gray-700">{`Chain ${index + 1} / ${numConfigs}`}</h3>
      <div className="grid grid-cols-2 gap-x-16">
        <div className="grid grid-cols-[min-content,1fr] gap-x-2 gap-y-1.5">
          <ConfigLabelAndValue label="Chain" value={chainDisplay} />
          <ConfigLabelAndValue label="Token" value={config.name} />
          <ConfigLabelAndValue label="Decimals" value={config.decimals} />
        </div>
        <div className="grid grid-cols-[min-content,1fr] gap-x-2 gap-y-1.5">
          <ConfigLabelAndValue label="Type" value={typeDisplay} />
          <ConfigLabelAndValue label="Symbol" value={config.symbol} />
          <ConfigLabelAndValue label="Supply" value={config.totalSupply || 'Infinite'} />
        </div>
      </div>
      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5">
        {tokenAddress && <ConfigLabelAndValue label="Collateral Address" value={tokenAddress} />}
        <ConfigLabelAndValue label="Contract Owner" value={config.owner} />
      </div>
    </div>
  );
}

function ConfigLabelAndValue({ label, value }: { label: string; value?: string | number }) {
  return (
    <>
      <span className="text-xs text-gray-700">{label}</span>
      <span className="text-xs">{value || 'Unknown'}</span>
    </>
  );
}

function InfoSection({ deploymentConfig }: { deploymentConfig: WarpDeploymentConfig }) {
  const onClickCopy = () => {
    const yamlConfig = stringify(deploymentConfig.config);
    tryClipboardSet(yamlConfig);
    toast.success('Config copied to clipboard');
  };

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-blue-500/5 px-3 py-2">
      <Image src={InfoCircle} width={16} alt="" />
      <p className="text-xs">
        To use more advanced settings, such as a custom{' '}
        <A className={styles.infoBtn} href={links.ismDocs}>
          Interchain Security Module
        </A>{' '}
        (ISM), you can{' '}
        <button onClick={onClickCopy} className={styles.infoBtn}>
          copy this config
        </button>{' '}
        and use the{' '}
        <A className={styles.infoBtn} href={links.cliDocs}>
          Hyperlane CLI.
        </A>
      </p>
    </div>
  );
}

function ButtonSection() {
  const { setPage } = useCardNav();
  const onClickContinue = () => {
    setPage(CardPage.WarpDeploy);
  };

  return (
    <div className="mt-4 flex items-center justify-between">
      <BackButton page={CardPage.WarpForm} />
      <SolidButton onClick={onClickContinue} className="gap-3 px-5 py-1.5" color="accent">
        <span>Deploy</span>
        <Image src={RocketIcon} width={14} height={14} alt="" />
      </SolidButton>
    </div>
  );
}

const styles = {
  infoBtn: 'underline underline-offset-2 cursor-pointer hover:text-primary-500',
};
