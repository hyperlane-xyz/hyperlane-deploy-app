import { AnimatePresence, motion } from 'framer-motion';
import { WarpDeploymentForm } from '../features/deployment/WarpDeploymentForm';
import { CardPage } from './CardPage';
import { LandingPage } from './LandingCard';
import { useCardNav } from './hooks';

export function CardFlow() {
  const { page, direction } = useCardNav();

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
        {page === CardPage.Landing && <LandingPage />}
        {page === CardPage.WarpForm && <WarpDeploymentForm />}
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
