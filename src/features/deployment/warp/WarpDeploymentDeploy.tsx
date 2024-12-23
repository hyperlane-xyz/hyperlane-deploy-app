import { ArrowIcon, Button, Modal, useModal, WalletIcon } from '@hyperlane-xyz/widgets';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { PlanetSpinner } from '../../../components/animation/PlanetSpinner';
import { SolidButton } from '../../../components/buttons/SolidButton';
import { GasIcon } from '../../../components/icons/GasIcon';
import { LogsIcon } from '../../../components/icons/LogsIcon';
import { StopIcon } from '../../../components/icons/StopIcon';
import { H1 } from '../../../components/text/Headers';
import { WARP_DEPLOY_GAS_UNITS } from '../../../consts/consts';
import { CardPage } from '../../../flows/CardPage';
import { useCardNav } from '../../../flows/hooks';
import { Color } from '../../../styles/Color';
import { useMultiProvider } from '../../chains/hooks';
import { getChainDisplayName } from '../../chains/utils';
import { useFundDeployerAccount } from '../../deployerWallet/fund';
import { getDeployerAddressForProtocol, useTempDeployerWallets } from '../../deployerWallet/hooks';
import { useWarpDeploymentConfig } from '../hooks';

enum DeployStep {
  FundDeployer,
  ExecuteDeploy,
  AddFunds,
}

export function WarpDeploymentDeploy() {
  return (
    <div className="flex w-full flex-col items-center space-y-5 py-2 xs:min-w-100">
      <HeaderSection />
      <MainSection />
      <ButtonSection />
    </div>
  );
}

function HeaderSection() {
  return <H1 className="text-center">Deploying Warp Route</H1>;
}

function MainSection() {
  const { setPage } = useCardNav();

  const [step, setStep] = useState(DeployStep.FundDeployer);

  const onDeployerFunded = () => {
    setStep(DeployStep.ExecuteDeploy);
  };

  const onFailure = (error: Error) => {
    // TODO carry error over via store state
    toast.error(error.message);
    setPage(CardPage.WarpFailure);
  };

  return (
    <div className="space-y-3">
      {step === DeployStep.FundDeployer && (
        <FundDeployerAccounts onSuccess={onDeployerFunded} onFailure={onFailure} />
      )}
      {step === DeployStep.ExecuteDeploy && <ExecuteDeploy />}
      {step === DeployStep.AddFunds && <FundSingleDeployerAccount />}
    </div>
  );
}

function FundDeployerAccounts({
  onSuccess,
  onFailure,
}: {
  onSuccess: () => void;
  onFailure: (error: Error) => void;
}) {
  const multiProvider = useMultiProvider();
  const { deploymentConfig } = useWarpDeploymentConfig();

  const chains = deploymentConfig?.chains || [];
  const protocols = Array.from(new Set(chains.map((c) => multiProvider.getProtocol(c))));
  const numChains = chains.length;
  const [currentChainIndex, setCurrentChainIndex] = useState(0);
  const currentChain = chains[currentChainIndex];
  const currentChainProtocol = multiProvider.getProtocol(currentChain);
  const currentChainDisplay = getChainDisplayName(multiProvider, currentChain, true);

  const { wallets, isLoading: isDeployerLoading } = useTempDeployerWallets(protocols, onFailure);
  const deployerAddress = getDeployerAddressForProtocol(wallets, currentChainProtocol);

  const { isPending: isTxPending, triggerTransaction } = useFundDeployerAccount(
    currentChain,
    WARP_DEPLOY_GAS_UNITS,
    deployerAddress,
  );

  const onClickFund = async () => {
    if (!deployerAddress) return;
    await triggerTransaction();
    if (currentChainIndex < numChains - 1) {
      setCurrentChainIndex(currentChainIndex + 1);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 py-4">
      <FundIcons color={Color.primary['500']} />
      <p className="max-w-sm text-center text-md leading-relaxed">
        To deploy, a temporary account must be funded for each chain. Unused amounts are refunded.
      </p>
      <SolidButton
        color="accent"
        className="px-3 py-1.5 text-md"
        onClick={onClickFund}
        disabled={isTxPending || isDeployerLoading}
      >{`Fund on ${currentChainDisplay} (Chain ${currentChainIndex + 1} / ${numChains})`}</SolidButton>
    </div>
  );
}

function FundSingleDeployerAccount() {
  const onClickFund = () => {
    // TODO transfers funds from wallet to deployer
  };

  return (
    <div className="flex flex-col items-center space-y-5 py-4">
      <FundIcons color={Color.amber['500']} />
      <p className="text-center text-sm font-semibold leading-relaxed">
        Deployer has insufficient funds on Ethereum.
      </p>
      <p className="max-w-sm text-center text-sm leading-relaxed">
        Please transfer more funds to finish the deployment. Any used amounts will be refunded.
      </p>
      <SolidButton color="accent" className="px-8 py-1.5 text-md" onClick={onClickFund}>
        Add funds
      </SolidButton>
    </div>
  );
}

function FundIcons({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <WalletIcon width={44} height={44} color={color} />
      <ArrowIcon width={20} height={20} color={color} direction="e" />
      <GasIcon width={42} height={42} color={color} />
    </div>
  );
}

function ExecuteDeploy() {
  const multiProvider = useMultiProvider();
  const { deploymentConfig } = useWarpDeploymentConfig();
  const chains = deploymentConfig?.chains || [];
  //TODO 'and' here
  const chainListString = chains.map((c) => getChainDisplayName(multiProvider, c, true)).join(', ');

  const { isOpen, open, close } = useModal();
  const onClickViewLogs = () => {
    // TODO get logs somehow
    open();
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex justify-center">
        <PlanetSpinner />
      </div>
      <div className="mt-1">
        <p className="max-w-sm text-gray-700">{`Deploying to ${chainListString}`}</p>
        <p className="text-gray-700">This will take a few minutes.</p>
        <p className="mt-2 text-sm">TODO status text</p>
      </div>
      <Button onClick={onClickViewLogs} className="mt-4 gap-2.5">
        <LogsIcon width={14} height={14} color={Color.accent['500']} />
        <span className="text-md text-accent-500">View deployment logs</span>
      </Button>
      <Modal isOpen={isOpen} close={close} panelClassname="p-4">
        <div>TODO logs here</div>
      </Modal>
    </div>
  );
}

function ButtonSection() {
  const { setPage } = useCardNav();
  const onClickCancel = () => {
    // TODO cancel in SDK if possible?
    toast.warn('Deployment cancelled');
    setPage(CardPage.WarpForm);
  };

  return (
    <Button onClick={onClickCancel} className="gap-2.5">
      <StopIcon width={16} height={16} color={Color.accent['500']} />
      <span className="text-md text-accent-500">Cancel deployment</span>
    </Button>
  );
}
