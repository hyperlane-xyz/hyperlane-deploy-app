import { MultiProtocolProvider, WarpCoreConfig } from '@hyperlane-xyz/sdk';
import { errorToString, sleep } from '@hyperlane-xyz/utils';
import { Button, Modal, SpinnerIcon, useModal } from '@hyperlane-xyz/widgets';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { PlanetSpinner } from '../../../components/animation/PlanetSpinner';
import { SlideIn } from '../../../components/animation/SlideIn';
import { SolidButton } from '../../../components/buttons/SolidButton';
import { GasIcon } from '../../../components/icons/GasIcon';
import { LogsIcon } from '../../../components/icons/LogsIcon';
import { StopIcon } from '../../../components/icons/StopIcon';
import { H1 } from '../../../components/text/Headers';
import { config } from '../../../consts/config';
import { WARP_DEPLOY_GAS_UNITS } from '../../../consts/consts';
import { CardPage } from '../../../flows/CardPage';
import { useCardNav } from '../../../flows/hooks';
import { Color } from '../../../styles/Color';
import { useMultiProvider } from '../../chains/hooks';
import { getChainDisplayName } from '../../chains/utils';
import { useFundDeployerAccount } from '../../deployerWallet/fund';
import { useRefundDeployerAccounts } from '../../deployerWallet/refund';
import { useOrCreateDeployerWallets } from '../../deployerWallet/wallets';
import { useDeploymentHistory, useWarpDeploymentConfig } from '../hooks';
import { DeploymentStatus, DeploymentType, WarpDeploymentConfig } from '../types';
import { useWarpDeployment } from './deploy';

const CANCEL_SLEEP_DELAY = config.isDevMode ? 5_000 : 10_000;

enum DeployStep {
  FundDeployer,
  ExecuteDeploy,
  AddFunds,
  CancelDeploy,
}

export function WarpDeploymentDeploy() {
  const { setPage } = useCardNav();
  const [step, setStep] = useState(DeployStep.FundDeployer);

  const multiProvider = useMultiProvider();
  const { deploymentConfig } = useWarpDeploymentConfig();
  const { updateDeploymentStatus, currentIndex, completeDeployment } = useDeploymentHistory();

  const { refundAsync } = useRefundDeployerAccounts();

  const onFailure = (error: Error) => {
    // TODO carry error over via store state
    updateDeploymentStatus(currentIndex, DeploymentStatus.Failed);
    const errorMsg = errorToString(error, 150);
    toast.error(errorMsg);
    setPage(CardPage.WarpFailure);
  };

  const onDeploymentSuccess = (config: WarpCoreConfig) => {
    completeDeployment(currentIndex, {
      type: DeploymentType.Warp,
      result: config,
    });
    refundAsync().finally(() => setPage(CardPage.WarpSuccess));
  };

  const {
    deploy,
    isIdle: isDeploymentIdle,
    isPending: isDeploymentPending,
    cancel: cancelDeployment,
  } = useWarpDeployment(deploymentConfig, onDeploymentSuccess, onFailure);

  const onDeployerFunded = () => {
    setStep(DeployStep.ExecuteDeploy);
    if (isDeploymentIdle) deploy();
  };

  const onCancel = async () => {
    if (isDeploymentPending) cancelDeployment();
    updateDeploymentStatus(currentIndex, DeploymentStatus.Cancelled);
    setStep(DeployStep.CancelDeploy);

    // A delay is required to ensure that pending txs have a chance to settle
    // before the refunder attempts to send new ones
    // This is imperfect but users can always run it again from DeployerRecoveryModal
    // TODO consider replacing with logic to check for pending txs from any deployer wallets
    await sleep(CANCEL_SLEEP_DELAY);

    refundAsync().finally(() => setPage(CardPage.WarpForm));
  };

  if (!deploymentConfig) throw new Error('Deployment config is required');

  return (
    <div className="flex w-full flex-col items-center space-y-4 py-2 xs:min-w-100">
      <H1 className="text-center">Deploying Warp Route</H1>
      <div className="flex grow flex-col items-center justify-center sm:min-h-[18rem]">
        <SlideIn motionKey={step} direction="forward">
          {step === DeployStep.FundDeployer && (
            <FundDeployerAccounts
              multiProvider={multiProvider}
              deploymentConfig={deploymentConfig}
              onSuccess={onDeployerFunded}
              onFailure={onFailure}
            />
          )}
          {step === DeployStep.ExecuteDeploy && (
            <ExecuteDeploy multiProvider={multiProvider} deploymentConfig={deploymentConfig} />
          )}
          {step === DeployStep.AddFunds && <FundSingleDeployerAccount />}
          {step === DeployStep.CancelDeploy && <CancelDeploy />}
        </SlideIn>
      </div>
      <CancelButton step={step} onCancel={onCancel} />
    </div>
  );
}

function FundDeployerAccounts({
  multiProvider,
  deploymentConfig,
  onSuccess,
  onFailure,
}: {
  multiProvider: MultiProtocolProvider;
  deploymentConfig: WarpDeploymentConfig;
  onSuccess: () => void;
  onFailure: (error: Error) => void;
}) {
  const { chains, protocols } = useMemo(() => {
    const chains = deploymentConfig?.chains || [];
    const protocols = Array.from(new Set(chains.map((c) => multiProvider.getProtocol(c))));
    return { chains, protocols };
  }, [deploymentConfig, multiProvider]);

  const numChains = chains.length;
  const [currentChainIndex, setCurrentChainIndex] = useState(0);
  const currentChain = chains[currentChainIndex];
  const currentChainProtocol = multiProvider.getProtocol(currentChain);
  const currentChainDisplay = getChainDisplayName(multiProvider, currentChain, true);

  const { wallets, isLoading: isDeployerLoading } = useOrCreateDeployerWallets(
    protocols,
    onFailure,
  );
  const deployerAddress = wallets[currentChainProtocol]?.address;

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
    <div className="flex flex-col items-center space-y-7">
      <FundIcon color={Color.primary['500']} />
      <p className="max-w-sm text-center text-md leading-relaxed">
        To deploy, a temporary account must be funded for each chain. Unused amounts are refunded.
      </p>
      <SolidButton
        color="accent"
        className="px-4 py-1.5 text-md"
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
      <FundIcon color={Color.amber['500']} />
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

function FundIcon({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center">
      <GasIcon width={68} height={68} color={color} />
    </div>
  );
}

function ExecuteDeploy({
  multiProvider,
  deploymentConfig,
}: {
  multiProvider: MultiProtocolProvider;
  deploymentConfig: WarpDeploymentConfig;
}) {
  const chains = deploymentConfig?.chains || [];
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
      <div className="mt-3">
        <p className="max-w-sm text-gray-700">{`Deploying to ${chainListString}`}</p>
        <p className="text-gray-700">This will take a few minutes</p>
        {/* <p className="mt-3">TODO status text</p> */}
      </div>
      <Button onClick={onClickViewLogs} className="mt-3 gap-2.5">
        <LogsIcon width={14} height={14} color={Color.accent['500']} />
        <span className="text-md text-accent-500">View deployment logs</span>
      </Button>
      <Modal isOpen={isOpen} close={close} panelClassname="p-4">
        <div>TODO logs here</div>
      </Modal>
    </div>
  );
}

function CancelDeploy() {
  return (
    <div className="flex flex-col items-center space-y-7">
      <SpinnerIcon width={70} height={70} color={Color.primary['500']} />
      <p className="max-w-sm text-center text-md leading-relaxed">
        Canceling the deployment and refunding any unused deployer balances
      </p>
      <p className="max-w-sm text-center text-md leading-relaxed">This may take a minute</p>
    </div>
  );
}

function CancelButton({ step, onCancel }: { step: DeployStep; onCancel: () => void }) {
  return (
    <Button onClick={onCancel} className="gap-2.5" disabled={step === DeployStep.CancelDeploy}>
      <StopIcon width={16} height={16} color={Color.accent['500']} />
      <span className="text-md text-accent-500">Cancel deployment</span>
    </Button>
  );
}
