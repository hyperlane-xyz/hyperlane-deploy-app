import { TokenType } from '@hyperlane-xyz/sdk';
import { toTitleCase } from '@hyperlane-xyz/utils';
import { Button, Modal, useModal } from '@hyperlane-xyz/widgets';
import { FormButton } from '../../../components/buttons/FormButton';

const TokenTypes = Object.values(TokenType);

export function TokenTypeSelectField({
  value,
}: {
  value: TokenType;
  onChange: (t: TokenType) => void;
}) {
  const { isOpen, close, open } = useModal();

  return (
    <div>
      <TokenTypeButton value={value} onClick={open} />
      <Modal isOpen={isOpen} close={close} panelClassname="p-4 md:p-5 max-w-sm">
        {TokenTypes.map((t, i) => (
          <TokenTypeOption type={t} close={close} key={i} />
        ))}
      </Modal>
    </div>
  );
}

function TokenTypeButton({ value, onClick }: { value: TokenType; onClick: () => void }) {
  return (
    <FormButton onClick={onClick} className="flex-col">
      <label htmlFor="tokenIndex" className="text-xs text-gray-600">
        Token Type
      </label>
      <div>{toTitleCase(value)}</div>
    </FormButton>
  );
}

function TokenTypeOption({ type, close }: { type: TokenType; close: () => void }) {
  const onClick = () => {
    close();
  };

  return (
    <Button onClick={onClick} className="flex items-center gap-2 px-4 py-2">
      {type}
    </Button>
  );
}
