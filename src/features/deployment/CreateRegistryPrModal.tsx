import { ErrorIcon, Modal } from '@hyperlane-xyz/widgets';
import { Form, Formik, useFormikContext } from 'formik';
import { SolidButton } from '../../components/buttons/SolidButton';
import { ImageInput } from '../../components/input/ImageUpload';
import { TextInput } from '../../components/input/TextField';
import { A } from '../../components/text/A';
import { H2 } from '../../components/text/Headers';
import { links } from '../../consts/links';
import { Color } from '../../styles/Color';
import {
  CreatePrForm,
  CreatePrFormSchema,
  CreatePrResponse,
  GithubIdentity,
} from '../../types/createPr';
import { normalizeEmptyStrings } from '../../utils/string';
import { zodErrorToFormikErrors } from '../../utils/zod';

export function CreateRegistryPrModal({
  isOpen,
  onCancel,
  onConfirm,
  confirmDisabled,
  disabled,
  response,
}: {
  isOpen: boolean;
  disabled: boolean;
  confirmDisabled: boolean;
  onCancel: () => void;
  onConfirm: (values: GithubIdentity) => void;
  response: CreatePrResponse | null | undefined;
}) {
  return (
    <Modal
      isOpen={isOpen}
      close={onCancel}
      panelClassname="p-4 flex flex-col items-center gap-4 max-w-xl"
    >
      <H2>Add this deployment to the Hyperlane Registry</H2>
      <p className={styles.text}>
        Would you like to create a Pull Request on Github to include this deployment to the{' '}
        <A className={styles.link} href={links.registry}>
          Hyperlane Registry
        </A>
        ? Once your PR is merged, your artifacts will become available for the community to use!
      </p>

      <p className={styles.text}>
        Optionally, you can include your Github username, organization and upload a logo!
      </p>

      <Formik<CreatePrForm>
        onSubmit={onConfirm}
        validate={validateForm}
        validateOnChange={false}
        validateOnBlur={false}
        initialValues={{ organization: undefined, username: undefined, logo: undefined }}
      >
        {() => (
          <Form className="w-full">
            {response && response.success ? (
              <div className={`${styles.text} w-full`}>
                <p>This is the link to your PR:</p>
                <div className="w-full space-y-2 rounded-lg bg-blue-500/5 px-3 py-4">
                  <A className={styles.link} href={response.data.prUrl}>
                    {response.data.prUrl}
                  </A>
                </div>
              </div>
            ) : (
              <InputSection />
            )}

            <ButtonsSection
              onCancel={onCancel}
              confirmDisabled={confirmDisabled}
              disabled={disabled}
            />
          </Form>
        )}
      </Formik>
    </Modal>
  );
}

function InputSection() {
  const { setFieldValue, values, errors } = useFormikContext<CreatePrForm>();

  return (
    <div>
      <div className="flex gap-4">
        <div className="w-full">
          <TextInput
            className="w-full"
            value={values.username ?? ''}
            onChange={(v) => setFieldValue('username', v)}
            placeholder="Github Username"
          />
          {errors.username && (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <ErrorIcon width={14} height={14} color={Color.red['600']} className="shrink-0" />
              <span className="text-xs text-red-600">{errors.username}</span>
            </div>
          )}
        </div>
        <div className="w-full">
          <TextInput
            className="w-full"
            value={values.organization ?? ''}
            onChange={(v) => setFieldValue('organization', v)}
            placeholder="Organization"
          />
          {errors.organization && (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <ErrorIcon width={14} height={14} color={Color.red['600']} className="shrink-0" />
              <span className="text-xs text-red-600">{errors.organization}</span>
            </div>
          )}
        </div>
      </div>
      <div className="w-full">
        <ImageInput
          className="w-full"
          onChange={(file) => setFieldValue('logo', file)}
          placeholder="File"
          value={values.logo}
          onClear={() => setFieldValue('logo', undefined)}
        />
        {errors.logo && (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <ErrorIcon width={14} height={14} color={Color.red['600']} className="shrink-0" />
            <span className="text-xs text-red-600">{errors.logo}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ButtonsSection({
  onCancel,
  confirmDisabled,
  disabled,
}: {
  onCancel: () => void;
  confirmDisabled: boolean;
  disabled: boolean;
}) {
  return (
    <div className="mt-4 flex w-full items-center justify-center gap-12">
      <SolidButton
        onClick={onCancel}
        color="gray"
        className="min-w-24 px-4 py-2"
        disabled={disabled}
      >
        Close
      </SolidButton>
      <SolidButton
        color="primary"
        className="min-w-24 px-4 py-2"
        disabled={disabled || confirmDisabled}
        type="submit"
      >
        Confirm
      </SolidButton>
    </div>
  );
}

const styles = {
  text: 'text-center text-sm text-gray-700',
  link: 'underline underline-offset-2 hover:opacity-80 active:opacity-70',
};

function validateForm(values: CreatePrForm) {
  const normalizedValues = normalizeEmptyStrings({
    organization: values.organization,
    username: values.username,
  });
  const parsedResult = CreatePrFormSchema.safeParse({ ...normalizedValues, logo: values.logo });
  if (!parsedResult.success) return zodErrorToFormikErrors(parsedResult.error);

  return undefined;
}
