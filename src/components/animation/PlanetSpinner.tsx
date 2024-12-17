import { motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion';
import Image from 'next/image';
import Planet1 from '../../images/illustrations/planet1.png';
import Planet2 from '../../images/illustrations/planet2.png';

export function PlanetSpinner() {
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
      <Image
        src={Planet1}
        width={90}
        height={90}
        alt=""
        className="animate-[spin_70s_linear_infinite]"
      />
      <motion.div style={{ position: 'absolute', x: x, y: y }}>
        <Image src={Planet2} width={26} height={26} alt="" className="" />
      </motion.div>
    </div>
  );
}
