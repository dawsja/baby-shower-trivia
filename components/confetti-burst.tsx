"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

type ConfettiBurstProps = {
  trigger: number;
};

export function ConfettiBurst({ trigger }: ConfettiBurstProps) {
  useEffect(() => {
    if (trigger === 0) {
      return;
    }

    const count = 180;
    const defaults: confetti.Options = {
      spread: 75,
      ticks: 170,
      gravity: 0.8,
      scalar: 0.95,
      zIndex: 999,
      colors: [
        "#60a5fa",
        "#22d3ee",
        "#34d399",
        "#facc15",
        "#fb7185",
        "#f97316",
        "#a78bfa",
        "#f8fafc",
      ],
    };

    confetti({
      ...defaults,
      particleCount: count,
      origin: { y: 0.65 },
    });

    confetti({
      ...defaults,
      particleCount: Math.round(count * 0.65),
      angle: 60,
      origin: { x: 0, y: 0.7 },
    });

    confetti({
      ...defaults,
      particleCount: Math.round(count * 0.65),
      angle: 120,
      origin: { x: 1, y: 0.7 },
    });
  }, [trigger]);

  return null;
}
