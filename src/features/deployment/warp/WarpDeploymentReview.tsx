import { WarpRouteDeployConfigSchema } from '@hyperlane-xyz/sdk';
import { fromWeiRounded, isAddress, objLength } from '@hyperlane-xyz/utils';
import { IconButton, PencilIcon, SpinnerIcon } from '@hyperlane-xyz/widgets';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { BackButton } from '../../../components/buttons/BackButton';
import { SolidButton } from '../../../components/buttons/SolidButton';
import { A } from '../../../components/text/A';
import { H1 } from '../../../components/text/Headers';
import { links } from '../../../consts/links';
import { CardPage } from '../../../flows/CardPage';
import { useCardNav } from '../../../flows/hooks';
import { Stepper } from '../../../flows/Stepper';
import RocketIcon from '../../../images/icons/rocket.svg';
import { Color } from '../../../styles/Color';
import { useMultiProvider } from '../../chains/hooks';
import { getChainDisplayName } from '../../chains/utils';
import { useDeploymentHistory, useWarpDeploymentConfig } from '../hooks';
import { DeploymentStatus } from '../types';
import { tryCopyConfig } from '../utils';
import { TokenTypeDescriptions } from './TokenTypeSelectField';
import { isSyntheticTokenType } from './utils';

// TODO move to widgets lib
import InfoCircle from '../../../images/icons/info-circle.svg';
import { useCheckAccountBalances } from './validation';

export function WarpDeploymentReview() {
  return (
    <div className="flex w-full flex-col items-stretch sm:max-w-128">
      <div className="space-y-5">
        <HeaderSection />
        <ConfigSection />
        <InfoSection />
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

function ConfigSection() {
  const { deploymentConfig } = useWarpDeploymentConfig();
  const chains = deploymentConfig?.chains || [];

  return (
    <div className="space-y-3">
      {chains.map((c, i) => (
        <ConfigItem key={c} chain={c} index={i} />
      ))}
    </div>
  );
}

function ConfigItem({ chain, index }: { chain: ChainName; index: number }) {
  const multiProvider = useMultiProvider();
  const { deploymentConfig, setDeploymentConfig } = useWarpDeploymentConfig();
  if (!deploymentConfig) return null;

  const numConfigs = objLength(deploymentConfig.config);
  const chainConfig = deploymentConfig.config[chain];
  const { name, symbol, decimals, totalSupply, type, owner } = chainConfig;
  // Cast here to workaround cumbersome discriminated union with many different cases
  const tokenAddress = (chainConfig as any).token;
  const isSynthetic = isSyntheticTokenType(type);

  const chainDisplay = getChainDisplayName(multiProvider, chain, true);
  const typeDisplay = TokenTypeDescriptions[type].label;
  const supplyDisplay = totalSupply ? fromWeiRounded(totalSupply, decimals, 0) : 'Infinite';

  const onChangeValue = (key: string, value: string) => {
    const newChainConfig = { ...chainConfig, [key]: value };
    const newCombinedConfig = { ...deploymentConfig.config, [chain]: newChainConfig };
    setDeploymentConfig({ ...deploymentConfig, config: newCombinedConfig });
  };

  return (
    <div className="space-y-2 rounded-lg bg-blue-500/5 px-3 py-2">
      <h3 className="text-xs font-medium text-gray-700">{`Chain ${index + 1} / ${numConfigs}`}</h3>
      <div className="grid grid-cols-2 gap-x-16">
        <div className="grid grid-cols-[min-content,1fr] gap-x-2 gap-y-2">
          <ConfigLabelAndValue label="Chain" value={chainDisplay} />
          <ConfigLabelAndValue
            label="Token"
            value={name}
            isEditable={isSynthetic}
            onChange={(v: string) => onChangeValue('name', v)}
          />
          <ConfigLabelAndValue label="Decimals" value={decimals} />
        </div>
        <div className="grid grid-cols-[min-content,1fr] gap-x-2 gap-y-2">
          <ConfigLabelAndValue label="Type" value={typeDisplay} />
          <ConfigLabelAndValue
            label="Symbol"
            value={symbol}
            isEditable={isSynthetic}
            onChange={(v: string) => onChangeValue('symbol', v)}
          />
          <ConfigLabelAndValue label="Supply" value={supplyDisplay} />
        </div>
      </div>
      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2">
        {tokenAddress && <ConfigLabelAndValue label="Collateral address" value={tokenAddress} />}
        <ConfigLabelAndValue
          label="Contract owner"
          value={owner}
          isEditable={true}
          onChange={(v: string) => {
            if (isAddress(v)) onChangeValue('owner', v);
          }}
        />
      </div>
    </div>
  );
}

function ConfigLabelAndValue({
  label,
  value,
  isEditable,
  onChange,
}: {
  label: string;
  value?: string | number;
  isEditable?: boolean;
  onChange?: (v: string) => void;
}) {
  const onClickEdit = () => {
    if (!isEditable || !onChange) return;
    const newValue = prompt(`Enter new ${label.toLowerCase()} value`);
    if (!newValue) return;
    onChange(newValue);
  };

  return (
    <>
      <div className="text-xs text-gray-700">{label}</div>
      <div className="flex items-center gap-2.5">
        <span className="text-xs">{value || 'Unknown'}</span>
        {isEditable && (
          <IconButton onClick={onClickEdit}>
            <PencilIcon width={11} height={11} color={Color.gray['700']} />
          </IconButton>
        )}
      </div>
    </>
  );
}

function InfoSection() {
  const { deploymentConfig } = useWarpDeploymentConfig();

  const onClickCopy = () => tryCopyConfig(deploymentConfig?.config);

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
  const { isPending, checkBalances } = useCheckAccountBalances();
  const { deploymentConfig } = useWarpDeploymentConfig();
  const { addDeployment } = useDeploymentHistory();
  const { setPage } = useCardNav();

  const onClickContinue = async () => {
    if (!deploymentConfig) return;
    // Re-validate config before proceeding in case edits broke something
    const schemaResult = WarpRouteDeployConfigSchema.safeParse(deploymentConfig.config);
    if (!schemaResult.success) {
      toast.error('Invalid config, please fix before deploying');
      return;
    }

    const chainNames = deploymentConfig.chains;
    const balanceResult = await checkBalances(chainNames);
    if (!balanceResult?.success) {
      toast.error(balanceResult.error);
      return;
    }

    addDeployment({
      status: DeploymentStatus.Configured,
      config: deploymentConfig,
    });
    setPage(CardPage.WarpDeploy);
  };

  return (
    <div className="mt-4 flex items-center justify-between">
      <BackButton page={CardPage.WarpForm} />
      <SolidButton onClick={onClickContinue} className="gap-3 px-5 py-2" color="accent">
        {isPending ? (
          <SpinnerIcon width={20} height={20} color={Color.white} className="mx-6" />
        ) : (
          <>
            <span>Deploy</span>
            <Image src={RocketIcon} width={14} height={14} alt="" />
          </>
        )}
      </SolidButton>
    </div>
  );
}

const styles = {
  infoBtn: 'underline underline-offset-2 cursor-pointer hover:text-primary-500',
};
