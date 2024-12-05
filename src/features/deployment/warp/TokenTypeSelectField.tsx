import { TokenType } from '@hyperlane-xyz/sdk';
import { Button, Modal, useModal } from '@hyperlane-xyz/widgets';

const TokenTypes = Object.values(TokenType);

export function TokenTypeSelectField({
  value,
}: {
  value: TokenType;
  onChange: (t: TokenType) => void;
}) {
  const { isOpen, close, open } = useModal();

  return (
    <div className="mt-2 flex items-center justify-between gap-4">
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
    <Button onClick={onClick} className="flex items-center gap-2 px-4 py-2">
      <label htmlFor="tokenIndex" className="block pl-0.5 text-sm text-gray-600">
        Token Type
      </label>
      <div>{value}</div>
    </Button>
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
