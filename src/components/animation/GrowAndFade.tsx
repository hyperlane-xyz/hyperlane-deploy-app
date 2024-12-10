import { AnimatePresence, motion } from 'framer-motion';
import { PropsWithChildren } from 'react';

export function GrowAndFade({ isVisible, children }: PropsWithChildren<{ isVisible: boolean }>) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div {...animation} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function GrowAndFadeList({ children }: PropsWithChildren<unknown>) {
  if (!children || !Array.isArray(children)) return null;
  return (
    <AnimatePresence>
      {children.map((child, i) => (
        <motion.div key={i} {...animation} className="overflow-hidden">
          {child}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

const animation = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.25, ease: 'easeInOut' },
};
