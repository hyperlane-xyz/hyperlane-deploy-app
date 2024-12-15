import { ArrowIcon, Button, WalletIcon } from '@hyperlane-xyz/widgets';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { SolidButton } from '../../../components/buttons/SolidButton';
import { GasIcon } from '../../../components/icons/GasIcon';
import { StopIcon } from '../../../components/icons/StopIcon';
import { H1 } from '../../../components/text/H1';
import { CardPage } from '../../../flows/CardPage';
import { useCardNav } from '../../../flows/hooks';
import { Color } from '../../../styles/Color';
import { useWarpDeploymentConfig } from '../hooks';

export function WarpDeploymentDeploy() {
  return (
    <div className="flex w-full flex-col items-center space-y-8 py-2 xs:min-w-100">
      <HeaderSection />
      <StatusSection />
      <ButtonSection />
    </div>
  );
}

function HeaderSection() {
  return <H1 className="text-center">Deploying Warp Route</H1>;
}

function StatusSection() {
  const { deploymentConfig } = useWarpDeploymentConfig();
  const _chains = deploymentConfig?.chains || [];

  return (
    <div className="space-y-3">
      <FundAccounts />
    </div>
  );
}

function FundAccounts() {
  const { deploymentConfig } = useWarpDeploymentConfig();
  const chains = deploymentConfig?.chains || [];
  const numChains = chains.length;

  const [currentChainIndex, setCurrentChainIndex] = useState(0);
  const currentChain = chains[currentChainIndex];

  const onClickFund = () => {
    // TODO create a temp deployer account and trigger a
    if (currentChainIndex < numChains - 1) {
      setCurrentChainIndex(currentChainIndex + 1);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-5">
      <div className="flex items-center justify-center gap-3">
        <WalletIcon width={40} height={40} color={Color.primary['500']} />
        <ArrowIcon width={30} height={30} color={Color.primary['500']} direction="e" />
        <GasIcon width={38} height={38} color={Color.primary['500']} />
      </div>
      <p className="max-w-sm text-center text-sm leading-relaxed">
        To deploy your route, a temporary account must be funded for each chain. Unused amounts are
        refunded.
      </p>
      <SolidButton
        color="accent"
        className="px-3 py-1.5 text-sm"
        onClick={onClickFund}
      >{`Fund on ${currentChain} (Chain ${currentChainIndex + 1} / ${numChains})`}</SolidButton>
    </div>
  );
}

function ButtonSection() {
  const { setPage } = useCardNav();
  const onClickCancel = () => {
    // TODO cancel in SDK if possible?
    toast.warn('Deployment cancelled');
    setPage(CardPage.WarpReview);
  };

  return (
    <Button onClick={onClickCancel} className="gap-2.5">
      <StopIcon width={16} height={16} color={Color.accent['500']} />
      <span className="text-md text-accent-500">Cancel deployment</span>
    </Button>
  );
}
