import {
  ArrowIcon,
  Button,
  Modal,
  SpinnerIcon,
  useModal,
  WalletIcon,
} from '@hyperlane-xyz/widgets';
import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'ethers';
import { useEffect, useState } from 'react';
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
import { getOrCreateTempDeployerWallet } from '../../deployerWallet/manage';
import { useWarpDeploymentConfig } from '../hooks';

enum DeployStep {
  PrepDeployer,
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
  // TODO remove?
  // const { deploymentConfig } = useWarpDeploymentConfig();
  // const _chains = deploymentConfig?.chains || [];
  const { setPage } = useCardNav();

  const [step, setStep] = useState(DeployStep.PrepDeployer);
  const [deployer, setDeployer] = useState<Wallet | undefined>(undefined);

  const onDeployerReady = (wallet: Wallet) => {
    setDeployer(wallet);
    setStep(DeployStep.FundDeployer);
  };

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
      {step === DeployStep.PrepDeployer && (
        <PrepDeployerAccounts onSuccess={onDeployerReady} onFailure={onFailure} />
      )}
      {step === DeployStep.FundDeployer && deployer && (
        <FundDeployerAccounts deployer={deployer} onSuccess={onDeployerFunded} />
      )}
      {step === DeployStep.ExecuteDeploy && deployer && <ExecuteDeploy />}
      {step === DeployStep.AddFunds && deployer && <FundSingleDeployerAccount />}
    </div>
  );
}

// TODO improve smoothness during card flow transition
// Maybe fold this into FundDeployerAccounts to avoid spinner flash
function PrepDeployerAccounts({
  onSuccess,
  onFailure,
}: {
  onSuccess: (wallet: Wallet) => void;
  onFailure: (error: Error) => void;
}) {
  const { error, data } = useQuery({
    queryKey: ['getDeployerWallet'],
    queryFn: getOrCreateTempDeployerWallet,
  });

  useEffect(() => {
    if (error) return onFailure(error);
    if (data) return onSuccess(data);
  }, [error, data, onSuccess, onFailure]);

  return (
    <div className="flex flex-col items-center gap-6 py-14">
      <SpinnerIcon width={48} height={48} color={Color.primary['500']} />
      <p className="text-center text-sm text-gray-700">Preparing deployer accounts</p>
    </div>
  );
}

function FundDeployerAccounts({
  deployer,
  onSuccess,
}: {
  deployer: Wallet;
  onSuccess: () => void;
}) {
  const multiProvider = useMultiProvider();
  const { deploymentConfig } = useWarpDeploymentConfig();
  const chains = deploymentConfig?.chains || [];
  const numChains = chains.length;

  const [currentChainIndex, setCurrentChainIndex] = useState(0);
  const currentChain = chains[currentChainIndex];
  const currentChainDisplay = getChainDisplayName(multiProvider, currentChain, true);

  const { isPending, triggerTransaction } = useFundDeployerAccount(
    deployer,
    currentChain,
    WARP_DEPLOY_GAS_UNITS,
  );

  const onClickFund = async () => {
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
        disabled={isPending}
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
