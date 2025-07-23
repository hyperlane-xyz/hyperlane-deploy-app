import { HypTokenRouterConfigMailboxOptional } from '@hyperlane-xyz/sdk';
import { Modal } from '@hyperlane-xyz/widgets';
import { SolidButton } from '../../../components/buttons/SolidButton';
import { H2 } from '../../../components/text/Headers';

export type NonSafeOwnersConfig = {
  chainName: string;
  config: HypTokenRouterConfigMailboxOptional;
};

export function OwnerAddressConfirmModal({
  isOpen,
  close,
  onConfirm,
  nonSafeOwners,
}: {
  isOpen: boolean;
  close: () => void;
  onConfirm: () => void;
  nonSafeOwners: NonSafeOwnersConfig[];
}) {
  return (
    <Modal
      isOpen={isOpen}
      close={close}
      panelClassname="p-4 flex flex-col items-center gap-4 max-w-2xl"
    >
      <H2>Confirm addresses</H2>
      <p className="text-center text-sm text-gray-700">
        The following are non-gnosis safe addresses set as the route owners. It is highly
        recommended that you use gnosis safes as owners for security purposes.
      </p>
      <p className="text-center text-sm text-gray-700">
        If you wish to continue regardless press confirm, otherwise press cancel and edit the route
        owners
      </p>
      <ul className="w-full space-y-2 rounded-lg bg-blue-500/5 px-3 py-4">
        {nonSafeOwners.map((nonSafeOwner) => (
          <li className="text-center text-sm text-gray-700" key={nonSafeOwner.chainName}>
            <strong>{nonSafeOwner.chainName}:</strong> {nonSafeOwner.config.owner}
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-center gap-12">
        <SolidButton onClick={close} color="gray" className="min-w-24 px-4 py-1">
          Cancel
        </SolidButton>
        <SolidButton
          onClick={() => {
            close();
            onConfirm();
          }}
          color="primary"
          className="min-w-24 px-4 py-1"
        >
          Confirm
        </SolidButton>
      </div>
    </Modal>
  );
}
