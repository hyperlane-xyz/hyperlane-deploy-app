import { ChevronIcon, useModal } from '@hyperlane-xyz/widgets';
import { FormButton } from '../../components/buttons/FormButton';
import { ChainLogo } from '../../components/icons/ChainLogo';
import { ChainSelectListModal } from './ChainSelectModal';
import { useChainDisplayName } from './hooks';

type Props = {
  value: ChainName;
  onChange: (chain: ChainName) => void;
};

export function ChainSelectField({ value, onChange }: Props) {
  const displayName = useChainDisplayName(value, true);

  const { isOpen, close, open } = useModal();

  return (
    <div className="flex-1 grow">
      <FormButton onClick={open} className="w-full gap-2 bg-white">
        <div className="flex items-center gap-3">
          <div className="max-w-[1.4rem] sm:max-w-fit">
            <ChainLogo chainName={value} size={30} />
          </div>
          <div className="gap- flex flex-col items-start">
            <label className="cursor-pointer text-xs text-gray-600">Chain</label>
            {displayName}
          </div>
        </div>
        <ChevronIcon width={11} height={8} direction="s" />
      </FormButton>
      <ChainSelectListModal isOpen={isOpen} close={close} onSelect={onChange} />
    </div>
  );
}
