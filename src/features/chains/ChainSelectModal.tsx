import { ChainMetadata } from '@hyperlane-xyz/sdk';
import { ChainSearchMenu, ChainSearchMenuProps, Modal } from '@hyperlane-xyz/widgets';
import { useStore } from '../store';

export function ChainSelectListModal({
  isOpen,
  close,
  onSelect,
  showChainDetails,
}: {
  isOpen: boolean;
  close: () => void;
  onSelect: (chain: ChainName) => void;
  showChainDetails?: ChainSearchMenuProps['showChainDetails'];
}) {
  const { chainMetadata, chainMetadataOverrides, setChainMetadataOverrides } = useStore((s) => ({
    chainMetadata: s.chainMetadata,
    chainMetadataOverrides: s.chainMetadataOverrides,
    setChainMetadataOverrides: s.setChainMetadataOverrides,
  }));

  const onSelectChain = (chain: ChainMetadata) => {
    onSelect(chain.name);
    close();
  };

  return (
    <Modal isOpen={isOpen} close={close} panelClassname="p-4 sm:p-5 max-w-lg min-h-[40vh]">
      <ChainSearchMenu
        chainMetadata={chainMetadata}
        onClickChain={onSelectChain}
        overrideChainMetadata={chainMetadataOverrides}
        onChangeOverrideMetadata={setChainMetadataOverrides}
        defaultSortField="custom"
        showChainDetails={showChainDetails}
      />
    </Modal>
  );
}
