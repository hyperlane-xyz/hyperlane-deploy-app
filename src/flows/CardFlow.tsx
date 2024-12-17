import { AnimatePresence, motion } from 'framer-motion';
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

// TODO instead of this somewhat custom approach, a more idiomatic approach would be to
// migrate the app to the AppRouter structure and then use pages instead of CardNav.
// But animations may be more difficult and the AppRouter is tricky for SPAs.
export function CardFlow() {
  const { page, direction } = useCardNav();

  const PageComponent = PAGE_TO_COMPONENT[FORCE_PAGE || page];

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={page}
        custom={direction}
        variants={variants}
        transition={transition}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <PageComponent />
      </motion.div>
      ;
    </AnimatePresence>
  );
}

const variants = {
  enter: (direction: 'forward' | 'backward') => ({
    opacity: 0,
    x: direction === 'forward' ? 40 : -40,
  }),
  center: { opacity: 1, x: 0 },
  exit: (direction: 'forward' | 'backward') => ({
    opacity: 0,
    x: direction === 'forward' ? -40 : 40,
  }),
};
const transition = { duration: 0.3 };
