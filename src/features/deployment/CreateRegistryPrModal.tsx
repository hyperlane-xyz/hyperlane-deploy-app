import { Modal } from '@hyperlane-xyz/widgets';
import { SolidButton } from '../../components/buttons/SolidButton';
import { A } from '../../components/text/A';
import { H2 } from '../../components/text/Headers';
import { links } from '../../consts/links';
import { CreatePrResponse } from '../../types/api';

export function CreateRegistryPrModal({
  isOpen,
  onCancel,
  onConfirm,
  confirmDisabled,
  disabled,
  data,
}: {
  isOpen: boolean;
  disabled: boolean;
  confirmDisabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  data: CreatePrResponse | null | undefined;
}) {
  return (
    <Modal
      isOpen={isOpen}
      close={onCancel}
      panelClassname="p-4 flex flex-col items-center gap-4 max-w-lg"
    >
      <H2>Add this deployment to the Hyperlane Registry</H2>
      <p className="text-center text-sm text-gray-700">
        Would you like to create a Pull Request on Github to include this deployment to the{' '}
        <A
          className="underline underline-offset-2 hover:opacity-80 active:opacity-70"
          href={links.registry}
        >
          Hyperlane Registry
        </A>
        ? Once your PR is merged, your artifacts will become available for the community to use!
      </p>

      {data && data.success && (
        <div>
          This is your the link to your PR
          <A
            className="underline underline-offset-2 hover:opacity-80 active:opacity-70"
            href={data.prUrl}
          >
            {data.prUrl}
          </A>
        </div>
      )}

      <ButtonsSection
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmDisabled={confirmDisabled}
        disabled={disabled}
      />
    </Modal>
  );
}

function ButtonsSection({
  onCancel,
  onConfirm,
  confirmDisabled,
  disabled,
}: {
  onCancel: () => void;
  onConfirm: () => void;
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
        onClick={onConfirm}
        color="primary"
        className="min-w-24 px-4 py-2"
        disabled={disabled || confirmDisabled}
      >
        Confirm
      </SolidButton>
    </div>
  );
}
