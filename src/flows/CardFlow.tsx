import { SlideIn } from '../components/animation/SlideIn';
import { WarpDeploymentDeploy } from '../features/deployment/warp/WarpDeploymentDeploy';
import { WarpDeploymentFailure } from '../features/deployment/warp/WarpDeploymentFailure';
import { WarpDeploymentForm } from '../features/deployment/warp/WarpDeploymentForm';
import { WarpDeploymentReview } from '../features/deployment/warp/WarpDeploymentReview';
import { WarpDeploymentSuccess } from '../features/deployment/warp/WarpDeploymentSuccess';
import { CardPage } from './CardPage';
import { LandingPage } from './LandingCard';
import { useCardNav } from './hooks';

// Useful for development, do not use in production
const FORCE_PAGE = undefined;
// const FORCE_PAGE = CardPage.WarpFailure;

const PAGE_TO_COMPONENT: Record<CardPage, React.FC> = {
  [CardPage.Landing]: LandingPage,
  [CardPage.WarpForm]: WarpDeploymentForm,
  [CardPage.WarpReview]: WarpDeploymentReview,
  [CardPage.WarpDeploy]: WarpDeploymentDeploy,
  [CardPage.WarpSuccess]: WarpDeploymentSuccess,
  [CardPage.WarpFailure]: WarpDeploymentFailure,
};

// TODO instead of this card-based navigation, a more idiomatic approach would be to
// migrate the app to the AppRouter structure and then use pages instead of CardNav.
// But animations may be more difficult and the AppRouter is tricky for SPAs.
export function CardFlow() {
  const { page, direction } = useCardNav();

  const PageComponent = PAGE_TO_COMPONENT[FORCE_PAGE || page];

  return (
    <SlideIn motionKey={page} direction={direction}>
      <PageComponent />
    </SlideIn>
  );
}
