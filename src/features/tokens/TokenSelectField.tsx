import { IToken } from '@hyperlane-xyz/sdk';
import { ChevronIcon } from '@hyperlane-xyz/widgets';
import { useState } from 'react';
import { TokenIcon } from '../../components/icons/TokenIcon';

type Props = {
  name: string;
  disabled?: boolean;
};

export function TokenSelectField({ name: _name, disabled }: Props) {
  // const { values } = useFormikContext<TransferFormValues>();
  // const [ helpers] = useField<number | undefined>(name);
  const [_isModalOpen, setIsModalOpen] = useState(false);

  // const onSelectToken = (newToken: IToken) => {
  //   // Set the token address value in formik state
  //   helpers.setValue(getIndexForToken(warpCore, newToken));
  //   // Update nft state in parent
  //   setIsNft(newToken.isNft());
  // };

  const onClickField = () => {
    if (!disabled) setIsModalOpen(true);
  };

  return (
    <>
      <TokenButton token={undefined} disabled={disabled} onClick={onClickField} />
    </>
  );
}

function TokenButton({
  token,
  disabled,
  onClick,
  isAutomatic,
}: {
  token?: IToken;
  disabled?: boolean;
  onClick?: () => void;
  isAutomatic?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.base} ${disabled ? styles.disabled : styles.enabled}`}
      onClick={onClick}
    >
      <div className="flex items-center">
        {token && <TokenIcon token={token} size={20} />}
        <span className={`ml-2 ${!token?.symbol && 'text-slate-400'}`}>
          {token?.symbol || (isAutomatic ? 'No routes available' : 'Select Token')}
        </span>
      </div>
      {!isAutomatic && <ChevronIcon width={12} height={8} direction="s" />}
    </button>
  );
}

const styles = {
  base: 'mt-1.5 w-full px-2.5 py-2.5 flex items-center justify-between text-sm rounded-lg border border-primary-300 outline-none transition-colors duration-500',
  enabled: 'hover:bg-gray-100 active:scale-95 focus:border-primary-500',
  disabled: 'bg-gray-100 cursor-default',
};
