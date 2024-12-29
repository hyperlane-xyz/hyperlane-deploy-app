import Link from 'next/link';

import { objLength } from '@hyperlane-xyz/utils';
import { DocsIcon, HistoryIcon, IconButton, useModal } from '@hyperlane-xyz/widgets';
import { links } from '../../consts/links';
import { DeployerRecoveryModal } from '../../features/deployerWallet/DeployerRecoveryModal';
import { useStore } from '../../features/store';
import { Color } from '../../styles/Color';
import { GasIcon } from '../icons/GasIcon';

export function FloatingButtonRow() {
  const { setIsSideBarOpen, isSideBarOpen, deployerKeys } = useStore((s) => ({
    setIsSideBarOpen: s.setIsSideBarOpen,
    isSideBarOpen: s.isSideBarOpen,
    deployerKeys: s.deployerKeys,
  }));

  const { isOpen, open, close } = useModal();

  const hasTempKeys = objLength(deployerKeys) > 0;

  return (
    <div className="absolute -top-8 right-2 flex items-center gap-3">
      {hasTempKeys && (
        <IconButton
          className={`p-0.5 ${styles.roundedCircle} `}
          title="Deployer Accounts"
          onClick={open}
        >
          <GasIcon color={Color.primary['500']} height={20} width={20} className="p-0.5" />
        </IconButton>
      )}
      <IconButton
        className={`p-0.5 ${styles.roundedCircle} `}
        title="History"
        onClick={() => setIsSideBarOpen(!isSideBarOpen)}
      >
        <HistoryIcon color={Color.primary['500']} height={22} width={22} />
      </IconButton>
      <Link
        href={links.warpDocs}
        target="_blank"
        className={`p-0.5 ${styles.roundedCircle} ${styles.link}`}
        title="Documentation"
      >
        <DocsIcon color={Color.primary['500']} height={21} width={21} className="p-px" />
      </Link>
      <DeployerRecoveryModal isOpen={isOpen} close={close} />
    </div>
  );
}

const styles = {
  link: 'hover:opacity-70 active:opacity-60',
  roundedCircle: 'rounded-full bg-white',
};
