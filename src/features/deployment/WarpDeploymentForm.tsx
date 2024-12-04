import { arbitrum, ethereum } from '@hyperlane-xyz/registry';
import { ProtocolType, errorToString } from '@hyperlane-xyz/utils';
import { AccountInfo, ChevronIcon, useAccounts } from '@hyperlane-xyz/widgets';
import { Form, Formik, useFormikContext } from 'formik';
import { useState } from 'react';
import { BackButton } from '../../components/buttons/BackButton';
import { ConnectAwareSubmitButton } from '../../components/buttons/ConnectAwareSubmitButton';
import { SolidButton } from '../../components/buttons/SolidButton';
import { config } from '../../consts/config';
import { CardPage } from '../../flows/CardPage';
import { Color } from '../../styles/Color';
import { logger } from '../../utils/logger';
import { ChainConnectionWarning } from '../chains/ChainConnectionWarning';
import { ChainSelectField } from '../chains/ChainSelectField';
import { ChainWalletWarning } from '../chains/ChainWalletWarning';
import { useChainDisplayName, useMultiProvider } from '../chains/hooks';
import { useStore } from '../store';
import { DeploymentFormValues } from './types';

const initialValues = {
  origin: ethereum.name,
  destination: arbitrum.name,
};

export function WarpDeploymentForm() {
  const multiProvider = useMultiProvider();

  const { accounts } = useAccounts(multiProvider, config.addressBlacklist);

  // Flag for if form is in input vs review mode
  const [isReview, setIsReview] = useState(false);

  const validate = (values: DeploymentFormValues) => validateForm(values, accounts);

  const onSubmitForm = (values: DeploymentFormValues) => {
    logger.debug('Reviewing deployment form values for:', values.origin, values.destination);
    setIsReview(true);
  };

  return (
    <Formik<DeploymentFormValues>
      initialValues={initialValues}
      onSubmit={onSubmitForm}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ isValidating }) => (
        <Form className="flex w-full flex-col items-stretch">
          <WarningBanners />
          <ChainSelectSection isReview={isReview} />
          <ButtonSection
            isReview={isReview}
            isValidating={isValidating}
            setIsReview={setIsReview}
          />
        </Form>
      )}
    </Formik>
  );
}

function ChainSelectSection({ isReview }: { isReview: boolean }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-4">
      <ChainSelectField name="origin" label="From" disabled={isReview} />
      <ChainSelectField name="destination" label="To" disabled={isReview} />
    </div>
  );
}

// function TokenSection({ isReview }: { isReview: boolean }) {
//   return (
//     <div className="flex-1">
//       <label htmlFor="tokenIndex" className="block pl-0.5 text-sm text-gray-600">
//         Token
//       </label>
//       <TokenSelectField name="tokenIndex" disabled={isReview} />
//     </div>
//   );
// }

function ButtonSection({
  isReview,
  isValidating,
  setIsReview,
}: {
  isReview: boolean;
  isValidating: boolean;
  setIsReview: (b: boolean) => void;
}) {
  const { values } = useFormikContext<DeploymentFormValues>();
  const chainDisplayName = useChainDisplayName(values.destination);

  // const onDoneTransactions = () => {
  //   setIsReview(false);
  //   setDeploymentLoading(false);
  //    resetForm();
  // };

  const { setDeploymentLoading } = useStore((s) => ({
    setDeploymentLoading: s.setDeploymentLoading,
  }));

  const triggerTransactionsHandler = async () => {
    setIsReview(false);
    setDeploymentLoading(true);
    alert('TODO stuff');
  };

  if (!isReview) {
    return (
      <div className="mt-4 flex items-center justify-between">
        <BackButton page={CardPage.Landing} />
        <ConnectAwareSubmitButton
          chainName={values.origin}
          text={isValidating ? 'Validating...' : 'Continue'}
          classes="px-3 py-1.5"
        />
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center justify-between space-x-4">
      <SolidButton
        type="button"
        color="primary"
        onClick={() => setIsReview(false)}
        className="px-6 py-1.5"
        icon={<ChevronIcon direction="w" width={10} height={6} color={Color.white} />}
      >
        <span>Edit</span>
      </SolidButton>
      <SolidButton
        type="button"
        color="accent"
        onClick={triggerTransactionsHandler}
        className="flex-1 px-3 py-1.5"
      >
        {`Send to ${chainDisplayName}`}
      </SolidButton>
    </div>
  );
}

function WarningBanners() {
  const { values } = useFormikContext<DeploymentFormValues>();
  return (
    // Max height to prevent double padding if multiple warnings are visible
    <div className="max-h-10">
      <ChainWalletWarning origin={values.origin} />
      <ChainConnectionWarning origin={values.origin} destination={values.destination} />
    </div>
  );
}

const insufficientFundsErrMsg = /insufficient.[funds|lamports]/i;
const emptyAccountErrMsg = /AccountNotFound/i;

async function validateForm(
  values: DeploymentFormValues,
  _accounts: Record<ProtocolType, AccountInfo>,
) {
  try {
    const { origin, destination } = values;
    // TODO
    return origin && destination;
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
