/**
 * AnimatedNumber — compteur qui anime de 0 (ou previous) → valeur finale.
 * Utilise requestAnimationFrame pour fluidité 60fps.
 *
 * Usage :
 *   <AnimatedNumber value={15.30} decimals={2} suffix="€" />
 *
 * S'anime au mount + à chaque changement de `value` (compare via ref).
 */

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  /** Durée de l'animation en ms. Défaut 800ms. */
  duration?: number;
  /** Active la animation (mettre false pour render direct sans animation). */
  animate?: boolean;
}

// Easing easeOutCubic (rapide au début, lent à la fin)
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 800,
  animate = true,
}: Props) {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);
  const previousValueRef = useRef(animate ? 0 : value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    const startValue = previousValueRef.current;
    const endValue = value;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      const current = startValue + (endValue - startValue) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
        previousValueRef.current = endValue;
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, animate]);

  return (
    <>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </>
  );
}
