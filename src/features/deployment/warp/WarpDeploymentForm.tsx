import { arbitrum, ethereum } from '@hyperlane-xyz/registry';
import { TokenType } from '@hyperlane-xyz/sdk';
import { isNumeric } from '@hyperlane-xyz/utils';
import { Button, ErrorIcon, IconButton, useAccounts, XIcon } from '@hyperlane-xyz/widgets';
import clsx from 'clsx';
import { Form, Formik, useFormikContext } from 'formik';
import Image from 'next/image';
import { useMemo } from 'react';
import { GrowAndFade, GrowAndFadeList } from '../../../components/animation/GrowAndFade';
import { BackButton } from '../../../components/buttons/BackButton';
import { ConnectAwareSubmitButton } from '../../../components/buttons/ConnectAwareSubmitButton';
import { TextInput } from '../../../components/input/TextField';
import { H1 } from '../../../components/text/Headers';
import { config } from '../../../consts/config';
import { CardPage } from '../../../flows/CardPage';
import { useCardNav } from '../../../flows/hooks';
import { Stepper } from '../../../flows/Stepper';
import PlusCircleIcon from '../../../images/icons/plus-circle.svg';
import { Color } from '../../../styles/Color';
import { logger } from '../../../utils/logger';
import { ChainConnectionWarning } from '../../chains/ChainConnectionWarning';
import { ChainSelectField } from '../../chains/ChainSelectField';
import { ChainWalletWarning } from '../../chains/ChainWalletWarning';
import { useMultiProvider } from '../../chains/hooks';
import { useDeploymentConfig } from '../hooks';
import { DeploymentConfig, DeploymentType } from '../types';
import { TokenTypeSelectField } from './TokenTypeSelectField';
import { WarpDeploymentConfigItem, WarpDeploymentFormValues } from './types';
import { isCollateralTokenType } from './utils';
import { validateWarpDeploymentForm } from './validation';

const initialValues: WarpDeploymentFormValues = {
  configs: [
    {
      chainName: ethereum.name,
      tokenType: TokenType.collateral,
      tokenAddress: '',
    },
    {
      chainName: arbitrum.name,
      tokenType: TokenType.synthetic,
    },
  ],
};

export function WarpDeploymentForm() {
  const multiProvider = useMultiProvider();
  const { accounts } = useAccounts(multiProvider, config.addressBlacklist);

  const { deploymentConfig, setDeploymentConfig } = useDeploymentConfig();
  // This is redundant with the store value but a temp copy is needed
  // to hold the result from the validation function because there's no
  // re-render in between Formik's call of validate and onSubmit
  let tempDeploymentConfig: DeploymentConfig | undefined = undefined;
  const setTempDeploymentConfig = (c: DeploymentConfig) => (tempDeploymentConfig = c);

  const initialValues = getInitialValues(deploymentConfig);

  const validate = (values: WarpDeploymentFormValues) =>
    validateWarpDeploymentForm(values, accounts, multiProvider, setTempDeploymentConfig);

  const { setPage } = useCardNav();
  const onSubmitForm = () => {
    if (!tempDeploymentConfig) {
      logger.warn('Warp deploy config is undefined, should have been set during validation');
      return;
    }
    setDeploymentConfig(tempDeploymentConfig);
    setPage(CardPage.WarpReview);
  };

  return (
    <Formik<WarpDeploymentFormValues>
      initialValues={initialValues}
      onSubmit={onSubmitForm}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {() => (
        <Form className="flex w-full flex-col items-stretch xs:min-w-112">
          <WarningBanners />
          <div className="space-y-5">
            <HeaderSection />
            <ConfigListSection />
            <ButtonSection />
          </div>
        </Form>
      )}
    </Formik>
  );
}

function HeaderSection() {
  return (
    <div className="flex items-center justify-between gap-10">
      <H1>Configure Warp Route</H1>
      <Stepper numSteps={5} currentStep={2} />
    </div>
  );
}

function ConfigListSection() {
  const { values } = useFormikContext<WarpDeploymentFormValues>();

  return (
    <div className="space-y-3">
      <GrowAndFadeList>
        {values.configs.map((config, index) => (
          <ChainTokenConfig key={index} index={index} config={config} />
        ))}
      </GrowAndFadeList>
      <AddConfigButton />
      <FormErrors />
    </div>
  );
}

function ChainTokenConfig({ config, index }: { config: WarpDeploymentConfigItem; index: number }) {
  const { values, setValues, errors, setErrors } = useFormikContext<WarpDeploymentFormValues>();

  const isRemoveDisabled = values.configs.length <= 2;
  const isCollateralized = isCollateralTokenType(config.tokenType);
  const hasError = !!errors[index];

  const onChange = (update: Partial<WarpDeploymentConfigItem>) => {
    const configs = [...values.configs];
    const updatedConfig = { ...configs[index], ...update };
    configs[index] = updatedConfig;
    setValues({ configs: configs });
    setErrors({ ...errors, [index]: undefined });
  };

  const onRemove = () => {
    if (isRemoveDisabled) return;
    const configs = [...values.configs];
    configs.splice(index, 1);
    setValues({ configs: configs });
    setErrors({ ...errors, [index]: undefined });
  };

  return (
    <div
      className={clsx(
        'space-y-1.5 rounded-lg px-3 pb-3 pt-2',
        hasError ? 'bg-red-500/5' : 'bg-blue-500/5',
      )}
    >
      <div className="flex justify-between">
        <h3 className="pl-1 text-xs text-gray-700">{`Chain ${index + 1}`}</h3>
        <IconButton title="Remove" onClick={onRemove} disabled={isRemoveDisabled}>
          <XIcon width={8} height={8} color={Color.gray['500']} />
        </IconButton>
      </div>
      <div className="flex items-center justify-stretch gap-4">
        <ChainSelectField
          value={config.chainName}
          onChange={(v) => {
            onChange({ chainName: v });
          }}
        />
        <TokenTypeSelectField
          value={config.tokenType}
          onChange={(v) => {
            onChange({ tokenType: v });
          }}
        />
      </div>
      <GrowAndFade isVisible={isCollateralized}>
        <TextInput
          value={config.tokenAddress}
          onChange={(v) => onChange({ tokenAddress: v })}
          placeholder="Token address (0x123...)"
          className="w-full"
        />
      </GrowAndFade>
    </div>
  );
}

function AddConfigButton() {
  const { values, setValues } = useFormikContext<WarpDeploymentFormValues>();

  const onClick = () => {
    const configs = [...values.configs];
    configs.push({
      chainName: '',
      tokenType: TokenType.synthetic,
      tokenAddress: '',
    });
    setValues({ configs });
  };

  return (
    <Button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg bg-blue-500/5 px-3 py-1.5 hover:bg-blue-500/10 hover:opacity-100"
    >
      <Image width={13} height={13} src={PlusCircleIcon} alt="Add Chain" />
      <span className="text-sm">Add Chain</span>
    </Button>
  );
}

function FormErrors() {
  const { errors } = useFormikContext<WarpDeploymentFormValues>();

  const errorData = Object.entries(errors)
    .filter(([_, message]) => !!message)
    .map(([key, message]) => ({
      label: isNumeric(key) ? `Chain ${parseInt(key) + 1}: ` : '',
      message,
    }));

  return (
    <GrowAndFade isVisible={errorData.length > 0}>
      <div className="rounded-lg bg-red-500/5">
        {errorData.map(({ label, message }) => (
          <div key={label} className="flex items-center gap-2 px-3 py-1.5">
            <ErrorIcon width={14} height={14} color={Color.red['600']} className="shrink-0" />
            <span className="text-xs text-red-600">{`${label}${message}`}</span>
          </div>
        ))}
      </div>
    </GrowAndFade>
  );
}

function ButtonSection() {
  const { values } = useFormikContext<WarpDeploymentFormValues>();
  const chains = useMemo(() => values.configs.map((c) => c.chainName), [values]);
  return (
    <div className="mt-4 flex items-center justify-between">
      <BackButton page={CardPage.Landing} />
      <ConnectAwareSubmitButton chains={chains} text="Continue" className="px-3 py-1.5" />
    </div>
  );
}

function WarningBanners() {
  const { values } = useFormikContext<WarpDeploymentFormValues>();
  return (
    // Max height to prevent double padding if multiple warnings are visible
    <div className="max-h-10">
      {/* TODO check all chains */}
      <ChainWalletWarning origin={values.configs[0].chainName} />
      <ChainConnectionWarning
        origin={values.configs[0].chainName}
        destination={values.configs[1].chainName}
      />
    </div>
  );
}

function getInitialValues(
  deploymentConfig: DeploymentConfig | undefined,
): WarpDeploymentFormValues {
  if (!deploymentConfig || deploymentConfig.type !== DeploymentType.Warp) return initialValues;
  const { config, chains } = deploymentConfig;
  return {
    configs: chains.map((c) => ({
      chainName: c,
      tokenType: config[c].type,
      tokenAddress: (config[c] as any).token,
    })),
  };
}
