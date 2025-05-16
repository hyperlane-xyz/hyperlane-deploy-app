import { MultiProtocolProvider, WarpCoreConfig } from '@hyperlane-xyz/sdk';
import { errorToString } from '@hyperlane-xyz/utils';
import { Button, SpinnerIcon, useModal } from '@hyperlane-xyz/widgets';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { PlanetSpinner } from '../../../components/animation/PlanetSpinner';
import { SlideIn } from '../../../components/animation/SlideIn';
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
import { useRefundDeployerAccounts } from '../../deployerWallet/refund';
import { useOrCreateDeployerWallets } from '../../deployerWallet/wallets';
import { LogModal } from '../../logs/LogModal';
import { useSdkLogWatcher } from '../../logs/useSdkLogs';
import { useDeploymentHistory, useWarpDeploymentConfig } from '../hooks';
import { DeploymentStatus, DeploymentType, WarpDeploymentConfig } from '../types';
import { useWarpDeployment } from './deploy';
import { WarpDeploymentConfirmModal } from './WarpDeploymentConfirmModal';
import { WarpDeploymentProgressIndicator } from './WarpDeploymentProgressIndicator';

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
  const { updateDeploymentStatus, currentIndex, completeDeployment, failDeployment } =
    useDeploymentHistory();

  useSdkLogWatcher();

  const { refundAsync } = useRefundDeployerAccounts();

  const onFailure = useCallback(
    (error: Error) => {
      const errMsg = errorToString(error, 5000);
      failDeployment(currentIndex, errMsg);
      refundAsync().finally(() => setPage(CardPage.WarpFailure));
    },
    [currentIndex, failDeployment, refundAsync, setPage],
  );

  const onDeploymentSuccess = useCallback(
    (config: WarpCoreConfig) => {
      // let tokens = config.tokens;
      // const hasCollaterizedTokens = tokens.some((token) =>
      //   TOKEN_COLLATERALIZED_STANDARDS.includes(token.standard),
      // );

      // // prompt for coinGeckoId if at least one token is collaterized
      // if (hasCollaterizedTokens) {
      //   const coinGeckoId = prompt(
      //     'Please input a coinGeckoId if you wish to include one with this deployment. Leave empty if not',
      //   );
      //   if (coinGeckoId) {
      //     tokens = tokens.map((token) => {
      //       if (TOKEN_COLLATERALIZED_STANDARDS.includes(token.standard))
      //         return { ...token, coinGeckoId };
      //       return token;
      //     });
      //   }
      // }

      completeDeployment(currentIndex, {
        type: DeploymentType.Warp,
        result: config,
      });
      refundAsync().finally(() => setPage(CardPage.WarpSuccess));
    },
    [currentIndex, completeDeployment, refundAsync, setPage],
  );

  const {
    deploy,
    isIdle: isDeploymentIdle,
    cancel: cancelDeployment,
  } = useWarpDeployment(deploymentConfig, onDeploymentSuccess, onFailure);

  const onDeployerFunded = useCallback(() => {
    setStep(DeployStep.ExecuteDeploy);
    if (isDeploymentIdle) deploy();
  }, [isDeploymentIdle, deploy, setStep]);

  const onCancel = useCallback(async () => {
    updateDeploymentStatus(currentIndex, DeploymentStatus.Cancelled);
    setStep(DeployStep.CancelDeploy);
    await cancelDeployment();
    refundAsync().finally(() => setPage(CardPage.WarpForm));
  }, [currentIndex, cancelDeployment, refundAsync, setPage, updateDeploymentStatus]);

  if (!deploymentConfig) throw new Error('Deployment config is required');

  return (
    <div
      className={clsx(
        'flex w-full flex-col items-center py-2 xs:min-w-100',
        step === DeployStep.ExecuteDeploy ? 'space-y-3' : 'space-y-4',
      )}
    >
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

  const {
    isPending: isTxPending,
    triggerTransaction,
    isConfirmOpen,
    closeConfirmModal,
    executeTransfer,
    excuteTransferPending,
  } = useFundDeployerAccount(currentChain, WARP_DEPLOY_GAS_UNITS, deployerAddress);

  const onFundSuccess = () => {
    if (currentChainIndex < numChains - 1) {
      setCurrentChainIndex(currentChainIndex + 1);
    } else {
      onSuccess();
    }
  };

  const onClickFund = async () => {
    if (!deployerAddress) return;
    const transactionResult = await triggerTransaction();
    if (transactionResult) onFundSuccess();
  };

  const onConfirmModal = async () => {
    if (!deployerAddress) return;
    const transactionResult = await executeTransfer();
    if (transactionResult) onFundSuccess();
  };

  return (
    <>
      <div className="flex flex-col items-center space-y-7">
        <FundIcon color={Color.primary['500']} />
        <p className="max-w-sm text-center text-md leading-relaxed">
          To deploy, a temporary account must be funded for each chain. Unused amounts are refunded.
        </p>
        <SolidButton
          color="accent"
          className="px-4 py-1.5 text-md"
          onClick={onClickFund}
          disabled={isTxPending || isDeployerLoading || excuteTransferPending}
        >
          {isTxPending ? (
            <>
              <span>Funding on {currentChainDisplay}</span>
              <SpinnerIcon width={18} height={18} color={Color.gray['600']} className="ml-3" />
            </>
          ) : (
            `Fund on ${currentChainDisplay} (Chain ${currentChainIndex + 1} / ${numChains})`
          )}
          {}
        </SolidButton>
      </div>
      <WarpDeploymentConfirmModal
        close={closeConfirmModal}
        isOpen={isConfirmOpen}
        onConfirm={onConfirmModal}
        chainName={currentChain}
      />
    </>
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

  const { isOpen, open, close } = useModal();

  return (
    <div className="flex flex-col items-center pb-1 text-center">
      <div className="flex justify-center">
        <PlanetSpinner />
      </div>
      <WarpDeploymentProgressIndicator
        chains={chains}
        multiProvider={multiProvider}
        className="mt-3"
      />
      <Button onClick={open} className="mt-5 gap-2.5">
        <LogsIcon width={14} height={14} color={Color.accent['500']} />
        <span className="text-md text-accent-500">View deployment logs</span>
      </Button>
      <LogModal isOpen={isOpen} close={close} />
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
