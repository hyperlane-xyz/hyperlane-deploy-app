import { arbitrum, ethereum } from '@hyperlane-xyz/registry';
import { TokenType } from '@hyperlane-xyz/sdk';
import { ProtocolType, errorToString } from '@hyperlane-xyz/utils';
import { AccountInfo, useAccounts } from '@hyperlane-xyz/widgets';
import { Form, Formik, useFormikContext } from 'formik';
import { BackButton } from '../../../components/buttons/BackButton';
import { ConnectAwareSubmitButton } from '../../../components/buttons/ConnectAwareSubmitButton';
import { H1 } from '../../../components/text/H1';
import { config } from '../../../consts/config';
import { CardPage } from '../../../flows/CardPage';
import { Stepper } from '../../../flows/Stepper';
import { logger } from '../../../utils/logger';
import { ChainConnectionWarning } from '../../chains/ChainConnectionWarning';
import { ChainSelectField } from '../../chains/ChainSelectField';
import { ChainWalletWarning } from '../../chains/ChainWalletWarning';
import { useMultiProvider } from '../../chains/hooks';
import { TokenTypeSelectField } from './TokenTypeSelectField';
import { WarpDeploymentConfigEntry, WarpDeploymentFormValues } from './types';

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
          <div className="space-y-6">
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
    <div className="">
      {values.configs.map((config, index) => (
        <ChainTokenConfig key={index} index={index} config={config} />
      ))}
    </div>
  );
}

function ChainTokenConfig({ config, index }: { config: WarpDeploymentConfigEntry; index: number }) {
  const { values, setValues } = useFormikContext<WarpDeploymentFormValues>();

  const onChange = (update: Partial<WarpDeploymentConfigEntry>) => {
    const allConfigs = [...values.configs];
    const updatedConfig = { ...allConfigs[index], ...update };
    allConfigs[index] = updatedConfig;
    setValues({ configs: allConfigs });
  };

  return (
    <div className="mt-2 flex items-center justify-between gap-4">
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
  );
}

function ButtonSection() {
  const { values } = useFormikContext<WarpDeploymentFormValues>();

  return (
    <div className="mt-4 flex items-center justify-between">
      <BackButton page={CardPage.Landing} />
      {/* // TODO check for all chains, not just one */}
      <ConnectAwareSubmitButton
        chainName={values.configs[0].chainName}
        text="Continue"
        classes="px-3 py-1.5"
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
