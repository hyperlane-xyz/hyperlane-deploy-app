import { arbitrum, ethereum } from '@hyperlane-xyz/registry';
import { TokenType } from '@hyperlane-xyz/sdk';
import { errorToString, ProtocolType } from '@hyperlane-xyz/utils';
import { AccountInfo, Button, IconButton, useAccounts, XIcon } from '@hyperlane-xyz/widgets';
import { Form, Formik, useFormikContext } from 'formik';
import Image from 'next/image';
import { useMemo } from 'react';
import { BackButton } from '../../../components/buttons/BackButton';
import { ConnectAwareSubmitButton } from '../../../components/buttons/ConnectAwareSubmitButton';
import { TextInput } from '../../../components/input/TextField';
import { H1 } from '../../../components/text/H1';
import { config } from '../../../consts/config';
import { CardPage } from '../../../flows/CardPage';
import { Stepper } from '../../../flows/Stepper';
import PlusCircleIcon from '../../../images/icons/plus-circle.svg';
import { Color } from '../../../styles/Color';
import { logger } from '../../../utils/logger';
import { ChainConnectionWarning } from '../../chains/ChainConnectionWarning';
import { ChainSelectField } from '../../chains/ChainSelectField';
import { ChainWalletWarning } from '../../chains/ChainWalletWarning';
import { useMultiProvider } from '../../chains/hooks';
import { TokenTypeSelectField } from './TokenTypeSelectField';
import { WarpDeploymentConfigEntry, WarpDeploymentFormValues } from './types';
import { isCollateralizedTokenType } from './utils';

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

  const validate = (values: WarpDeploymentFormValues) => validateForm(values, accounts);

  const onSubmitForm = (values: WarpDeploymentFormValues) => {
    logger.debug('Deployment form values', values);
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
        <Form className="flex w-full flex-col items-stretch">
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
    <div className="flex items-center justify-between gap-4">
      <H1>Configure Warp Route</H1>
      <Stepper numSteps={5} currentStep={2} />
    </div>
  );
}

function ConfigListSection() {
  const { values } = useFormikContext<WarpDeploymentFormValues>();

  return (
    <div className="space-y-3">
      {values.configs.map((config, index) => (
        <ChainTokenConfig key={index} index={index} config={config} />
      ))}
      <AddConfigButton />
    </div>
  );
}

function ChainTokenConfig({ config, index }: { config: WarpDeploymentConfigEntry; index: number }) {
  const { values, setValues } = useFormikContext<WarpDeploymentFormValues>();

  const isRemoveDisabled = values.configs.length <= 2;
  const isCollateralized = isCollateralizedTokenType(config.tokenType);

  const onChange = (update: Partial<WarpDeploymentConfigEntry>) => {
    const configs = [...values.configs];
    const updatedConfig = { ...configs[index], ...update };
    configs[index] = updatedConfig;
    setValues({ configs: configs });
  };

  const onRemove = () => {
    if (isRemoveDisabled) return;
    const configs = [...values.configs];
    configs.splice(index, 1);
    setValues({ configs: configs });
  };

  return (
    <div className="space-y-1.5 rounded-lg bg-blue-500/5 px-3 pb-3 pt-2">
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
      {/* TODO animate entry */}
      {isCollateralized && (
        <div>
          <TextInput
            value={config.tokenAddress}
            onChange={(v) => onChange({ tokenAddress: v })}
            placeholder="Token address (0x123...)"
            className="w-full"
          />
        </div>
      )}
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

function ButtonSection() {
  const { values } = useFormikContext<WarpDeploymentFormValues>();
  const chains = useMemo(() => values.configs.map((c) => c.chainName), [values]);
  return (
    <div className="mt-4 flex items-center justify-between">
      <BackButton page={CardPage.Landing} />
      <ConnectAwareSubmitButton<WarpDeploymentFormValues>
        chains={chains}
        text="Continue"
        className="px-3 py-1.5"
      />
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

const insufficientFundsErrMsg = /insufficient.[funds|lamports]/i;
const emptyAccountErrMsg = /AccountNotFound/i;

async function validateForm(
  values: WarpDeploymentFormValues,
  _accounts: Record<ProtocolType, AccountInfo>,
) {
  try {
    const { configs } = values;
    // TODO
    return configs.length >= 2;
  } catch (error: any) {
    logger.error('Error validating form', error);
    let errorMsg = errorToString(error, 40);
    const fullError = `${errorMsg} ${error.message}`;
    if (insufficientFundsErrMsg.test(fullError) || emptyAccountErrMsg.test(fullError)) {
      errorMsg = 'Insufficient funds for gas fees';
    }
    return { form: errorMsg };
  }
}
