import { useEffect, useState } from 'react';

/**
 * useReducedMotion — Respects OS-level animation preferences.
 * Returns `true` when user has requested reduced motion in system settings.
 *
 * Usage:
 *   const prefersReduced = useReducedMotion();
 *   const transition = prefersReduced ? { duration: 0 } : { type: 'spring', ... };
 */
export const useReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
};

export default useReducedMotion;
