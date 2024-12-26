import { AnimatePresence, motion } from 'framer-motion';
import { PropsWithChildren } from 'react';

export function SlideIn({
  key,
  direction,
  children,
}: PropsWithChildren<{ key: string | number; direction: 'forward' | 'backward' }>) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={key}
        custom={direction}
        variants={variants}
        transition={transition}
        initial="enter"
        animate="center"
        exit="exit"
      >
        {children}
      </motion.div>
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
const transition = { duration: 0.5 };
