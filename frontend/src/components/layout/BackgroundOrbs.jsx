import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function BackgroundOrbs() {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 35, damping: 22 });
  const y = useSpring(pointerY, { stiffness: 35, damping: 22 });
  const slowX = useSpring(pointerX, { stiffness: 24, damping: 20 });
  const slowY = useSpring(pointerY, { stiffness: 24, damping: 20 });

  useEffect(() => {
    const move = (event) => {
      pointerX.set((event.clientX / window.innerWidth - 0.5) * 30);
      pointerY.set((event.clientY / window.innerHeight - 0.5) * 30);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [pointerX, pointerY]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-cream">
      <motion.div style={{ x, y }} className="absolute -left-32 -top-28 h-[32rem] w-[32rem] rounded-full bg-pink-light/40 blur-[100px]" />
      <motion.div style={{ x: slowX, y: slowY }} className="absolute -bottom-48 -right-36 h-[34rem] w-[34rem] rounded-full bg-burgundy/[0.07] blur-[120px]" />
      <div className="absolute left-[45%] top-[40%] h-64 w-64 rounded-full bg-cream-deep/[0.28] blur-[100px]" />
    </div>
  );
}
