import {
  motion,
  useAnimation,
  useAnimationFrame,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import Image from 'next/image';
import { useEffect } from 'react';
import Planet1 from '../../images/illustrations/planet1.png';
import Planet2 from '../../images/illustrations/planet2.png';

export function PlanetSpinner() {
  // Planet 1 animation:
  // This rotates around the center of the div
  const controls = useAnimation();
  useEffect(() => {
    controls.start({
      rotate: 360,
      transition: {
        repeat: Infinity,
        duration: 70,
        ease: 'linear',
      },
    });
  }, [controls]);

  // Planet 2 animation:
  // These transform functions calculate the x and y position based on the angle
  const angle = useMotionValue(0);
  const x = useTransform(angle, (value) => 70 * Math.cos(value));
  const y = useTransform(angle, (value) => 70 * Math.sin(value));

  useAnimationFrame((t) => {
    angle.set(t / 5000); // Controls the speed of rotation
  });

  return (
    <div
      style={{
        backgroundImage: 'url(/backgrounds/planet-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
      className="relative flex items-center justify-center rounded-full p-10"
    >
      <motion.div animate={controls}>
        <Image src={Planet1} width={90} height={90} alt="" />
      </motion.div>
      <motion.div style={{ position: 'absolute', x: x, y: y }}>
        <Image src={Planet2} width={26} height={26} alt="" className="" />
      </motion.div>
    </div>
  );
}
