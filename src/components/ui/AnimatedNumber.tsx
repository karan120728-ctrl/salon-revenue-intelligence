'use client';

import { useState, useEffect, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

export default function AnimatedNumber({ value, prefix = '', suffix = '', duration = 900 }: AnimatedNumberProps) {
  const [n, setN] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    let start: number | null = null;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {n.toLocaleString('en-GB')}
      {suffix}
    </span>
  );
}
