'use client';

import { useState, useEffect } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

export function useCountUp(end: number, duration: number = 2, isInView: boolean = false, delay: number = 0) {
  const [value, setValue] = useState(0);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 50,
    stiffness: 100,
    duration: duration * 1000
  });

  useEffect(() => {
    if (isInView) {
      // Add a small delay if requested
      const timer = setTimeout(() => {
        motionValue.set(end);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, end, motionValue, delay]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', latest => {
      setValue(Math.round(latest));
    });
    return unsubscribe;
  }, [springValue]);

  return value;
}
