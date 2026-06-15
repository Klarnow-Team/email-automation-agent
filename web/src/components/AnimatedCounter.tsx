"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 1400;
const isServer = typeof window === "undefined";

export function AnimatedCounter({
  value,
  durationMs = DEFAULT_DURATION_MS,
  format = (n) => String(Math.round(n)),
}: {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      fromRef.current = value;
    } else {
      fromRef.current = display;
    }
  }, [value]);

  useEffect(() => {
    if (isServer || typeof requestAnimationFrame === "undefined") {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const startVal = fromRef.current;
    const diff = value - startVal;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      const current = startVal + diff * eased;
      setDisplay(current);
      if (progress >= 1) fromRef.current = value;
      if (progress < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value, durationMs]);

  return <span>{format(display)}</span>;
}
