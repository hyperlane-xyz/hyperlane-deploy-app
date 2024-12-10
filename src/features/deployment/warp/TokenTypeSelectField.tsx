import { TokenType } from '@hyperlane-xyz/sdk';
import { Button, ChevronIcon, Modal, useModal } from '@hyperlane-xyz/widgets';
import { FormButton } from '../../../components/buttons/FormButton';

const TokenTypes = Object.values(TokenType).sort();
const PopularTokenTypes = [TokenType.collateral, TokenType.native, TokenType.synthetic];
const TokenTypeDescriptions: Record<TokenType, { label: string; description: string }> = {
  [TokenType.collateral]: {
    label: 'Collateral',
    description: 'A lock-and-mint wrapper for ERC20 tokens.',
  },
  [TokenType.collateralFiat]: {
    label: 'Collateral Fiat',
    description: 'A lock-and-mint wrapper for the FiatToken standard by Circle.',
  },
  [TokenType.collateralUri]: {
    label: 'Collateral NFT',
    description: 'A lock-and-mint wrapper for ERC721 tokens.',
  },
  [TokenType.collateralVault]: {
    label: 'Collateral Vault',
    description:
      'A lock-and-mint wrapper for ERC4626 vaults. Yields are manually claimed by owner.',
  },
  [TokenType.collateralVaultRebase]: {
    label: 'Collateral Rebased Vault',
    description: 'A lock-and-mint wrapper for ERC4626 vaults. Rebases yields to token holders.',
  },
  [TokenType.fastCollateral]: {
    label: 'Fast Collateral',
    description: 'A collateralized wrapper but with support for LP-provided faster transfers.',
  },
  [TokenType.fastSynthetic]: {
    label: 'Fast Synthetic',
    description: 'A synthetic HypErc20 token to pair with a Fast Collateral token.',
  },
  [TokenType.native]: {
    label: 'Native',
    description: 'A lock-and-mint wrapper for native currencies such as Ether (ETH).',
  },
  [TokenType.nativeScaled]: {
    label: 'Fast Collateral',
    description: 'A native type but with support for token decimal scaling.',
  },
  [TokenType.synthetic]: {
    label: 'Synthetic',
    description: 'A synthetic HypErc20 token to pair with any collateralized type.',
  },
  [TokenType.syntheticRebase]: {
    label: 'Synthetic Rebased',
    description: 'A synthetic HypErc20 token to pair with a Collateral Rebased Vault.',
  },
  [TokenType.syntheticUri]: {
    label: 'Synthetic NFT',
    description: 'A synthetic HypErc721 token to pair with a Collateral NFT.',
  },
  [TokenType.XERC20]: {
    label: 'xERC20',
    description: 'A lock-and-mint wrapper for xERC20 tokens.',
  },
  [TokenType.XERC20Lockbox]: {
    label: 'xERC20 Lockbox',
    description: 'A lock-and-mint wrapper for xERC20 Lockbox tokens.',
  },
};

export function TokenTypeSelectField({
  value,
  onChange,
}: {
  value: TokenType;
  onChange: (t: TokenType) => void;
}) {
  const { isOpen, close, open } = useModal();

  const onClick = (t: TokenType) => {
    onChange(t);
    close();
  };

  return (
    <div className="flex-1 grow">
      <TokenTypeButton value={value} onClick={open} />
      <Modal isOpen={isOpen} close={close} panelClassname="px-3 py-3 max-w-lg">
        <h2 className="px-2 pb-1.5 text-gray-600">Popular Token Types</h2>
        <div className="divide-y">
          {PopularTokenTypes.map((t, i) => (
            <TokenTypeOption type={t} onClick={onClick} key={i} />
          ))}
        </div>
        <h2 className="border-gray-100 px-2 pb-2 pt-4 text-gray-600">Other Token Types</h2>
        <div className="divide-y">
          {TokenTypes.map((t, i) =>
            PopularTokenTypes.includes(t) ? null : (
              <TokenTypeOption type={t} onClick={onClick} key={i} />
            ),
          )}
        </div>
      </Modal>
    </div>
  );
}

function TokenTypeButton({ value, onClick }: { value: TokenType; onClick: () => void }) {
  return (
    <FormButton onClick={onClick} className="w-full gap-2 bg-white hover:bg-gray-100">
      <div className="flex flex-col items-start">
        <label className="cursor-pointer text-xs text-gray-600">Token Type</label>
        <span>{TokenTypeDescriptions[value].label}</span>
      </div>
      <ChevronIcon width={11} height={8} direction="s" />
    </FormButton>
  );
}

function TokenTypeOption({ type, onClick }: { type: TokenType; onClick: (t: TokenType) => void }) {
  return (
    <Button
      onClick={() => onClick(type)}
      className="flex w-full flex-col items-start gap-px rounded border-gray-100 px-2 py-1.5 text-left last-of-type:border-b-0 hover:bg-gray-100 hover:opacity-100"
    >
      <h3 className="text-sm text-primary-500">{TokenTypeDescriptions[type].label}</h3>
      <p className="text-xs text-gray-700">{TokenTypeDescriptions[type].description}</p>
    </Button>
  );
}
