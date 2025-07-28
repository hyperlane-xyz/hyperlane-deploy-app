import { ErrorIcon, Modal } from '@hyperlane-xyz/widgets';
import { Form, Formik, useFormikContext } from 'formik';
import { SolidButton } from '../../components/buttons/SolidButton';
import { TextInput } from '../../components/input/TextField';
import { A } from '../../components/text/A';
import { H2 } from '../../components/text/Headers';
import { POPULAR_COIN_GECKO_IDS } from '../../consts/consts';
import { links } from '../../consts/links';
import { Color } from '../../styles/Color';
import { useLatestDeployment } from './hooks';
import { DeploymentResult, DeploymentType } from './types';
import { CoinGeckoFormValues } from './warp/types';

export function CoinGeckoConfirmationModal({
  isOpen,
  onCancel,
  onSubmit,
  close,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onSubmit: (values: CoinGeckoFormValues) => void;
  close: () => void;
}) {
  const { result } = useLatestDeployment();
  const initialCoinGeckoId = getInitialCoinGeckoId(result);
  return (
    <Modal
      isOpen={isOpen}
      close={close}
      panelClassname="p-4 flex flex-col items-center gap-4 max-w-lg"
    >
      <H2>Include a coinGeckoId</H2>
      <p className="text-center text-sm text-gray-700">
        CoinGecko provides a fundamental analysis of the crypto market. By including one you will be
        able to track price of collaterized tokens. Below is a suggested coinGeckoId, you can edit
        this field and check if it is valid by visiting{' '}
        <A
          className="underline underline-offset-2 hover:opacity-80 active:opacity-70"
          href={links.coinGecko}
        >
          their site.
        </A>{' '}
        If you do not wish to include a coinGeckoId, please press skip
      </p>
      <Formik<CoinGeckoFormValues>
        initialValues={{ coinGeckoId: initialCoinGeckoId }}
        validate={validateForm}
        onSubmit={onSubmit}
        validateOnChange={false}
        validateOnBlur={false}
      >
        {() => (
          <Form className="w-full">
            <InputSection />
            <ButtonsSection onCancel={onCancel} />
          </Form>
        )}
      </Formik>
    </Modal>
  );
}

function InputSection() {
  const { setFieldValue, values, errors } = useFormikContext<CoinGeckoFormValues>();

  return (
    <>
      <TextInput
        value={values.coinGeckoId}
        onChange={(v) => setFieldValue('coinGeckoId', v)}
        placeholder="coinGeckoId (ethereum)"
        className="w-full"
      />
      {errors.coinGeckoId && (
        <div className="flex items-center gap-2 px-3 py-1.5">
          <ErrorIcon width={14} height={14} color={Color.red['600']} className="shrink-0" />
          <span className="text-xs text-red-600">{errors.coinGeckoId}</span>
        </div>
      )}
    </>
  );
}

function ButtonsSection({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="mt-4 flex w-full items-center justify-center gap-12">
      <SolidButton onClick={onCancel} color="gray" className="min-w-24 px-4 py-2">
        Skip
      </SolidButton>
      <SolidButton color="primary" className="min-w-24 px-4 py-2" type="submit">
        Confirm
      </SolidButton>
    </div>
  );
}

function validateForm(values: CoinGeckoFormValues) {
  if (!values.coinGeckoId) return { coinGeckoId: 'Field is required' };

  return undefined;
}

function getInitialCoinGeckoId(deployment: DeploymentResult | undefined) {
  if (!deployment || deployment.type !== DeploymentType.Warp) return '';

  const tokens = deployment.result.tokens;
  if (!tokens.length) return '';

  const coinGeckoId = tokens.find((token) => token.coinGeckoId)?.coinGeckoId;
  if (coinGeckoId) return coinGeckoId;

  const symbol = tokens[0].symbol;
  return POPULAR_COIN_GECKO_IDS[symbol] || symbol.toLowerCase();
}
