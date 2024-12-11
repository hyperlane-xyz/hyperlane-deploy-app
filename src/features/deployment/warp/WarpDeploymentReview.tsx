import { BackButton } from '../../../components/buttons/BackButton';
import { SolidButton } from '../../../components/buttons/SolidButton';
import { H1 } from '../../../components/text/H1';
import { CardPage } from '../../../flows/CardPage';
import { useCardNav } from '../../../flows/hooks';
import { Stepper } from '../../../flows/Stepper';
import { useMultiProvider } from '../../chains/hooks';
import { useStore } from '../../store';

export function WarpDeploymentReview() {
  return (
    <div className="flex w-full flex-col items-stretch xs:min-w-112">
      <div className="space-y-5">
        <HeaderSection />
        <ConfigSection />
        <ButtonSection />
      </div>
    </div>
  );
}

function HeaderSection() {
  return (
    <div className="flex items-center justify-between gap-10">
      <H1>Review Deployment</H1>
      <Stepper numSteps={5} currentStep={3} />
    </div>
  );
}

function ConfigSection() {
  const _multiProvider = useMultiProvider();
  const { deploymentConfig } = useStore((s) => ({ deploymentConfig: s.deploymentConfig }));
  return <div>{JSON.stringify(deploymentConfig)}</div>;
}

function ButtonSection() {
  const { setPage } = useCardNav();
  const onClickContinue = () => {
    setPage(CardPage.WarpDeploy);
  };

  return (
    <div className="mt-4 flex items-center justify-between">
      <BackButton page={CardPage.WarpForm} />
      <SolidButton onClick={onClickContinue} className="px-3 py-1.5" color="accent">
        Deploy
      </SolidButton>
    </div>
  );
}
