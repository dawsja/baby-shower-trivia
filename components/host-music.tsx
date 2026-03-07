"use client";

import { useCallback, useEffect, useRef } from "react";

type HostMusicProps = {
  isPlaying: boolean;
  volume?: number;
};

// Cheerful looping melody — major-key game show feel
const MELODY = [
  // Bar 1
  { note: 523.25, dur: 0.18 }, // C5
  { note: 587.33, dur: 0.18 }, // D5
  { note: 659.25, dur: 0.18 }, // E5
  { note: 523.25, dur: 0.18 }, // C5
  // Bar 2
  { note: 698.46, dur: 0.18 }, // F5
  { note: 783.99, dur: 0.36 }, // G5 (long)
  { note: 0, dur: 0.12 },      // rest
  // Bar 3
  { note: 659.25, dur: 0.18 }, // E5
  { note: 698.46, dur: 0.18 }, // F5
  { note: 783.99, dur: 0.18 }, // G5
  { note: 880.0, dur: 0.36 },  // A5 (long)
  { note: 0, dur: 0.12 },      // rest
  // Bar 4
  { note: 783.99, dur: 0.18 }, // G5
  { note: 659.25, dur: 0.18 }, // E5
  { note: 523.25, dur: 0.36 }, // C5 (long)
  { note: 0, dur: 0.24 },      // rest
  // Bar 5
  { note: 392.0, dur: 0.18 },  // G4
  { note: 440.0, dur: 0.18 },  // A4
  { note: 523.25, dur: 0.18 }, // C5
  { note: 440.0, dur: 0.18 },  // A4
  // Bar 6
  { note: 523.25, dur: 0.18 }, // C5
  { note: 659.25, dur: 0.36 }, // E5 (long)
  { note: 0, dur: 0.12 },      // rest
  // Bar 7
  { note: 587.33, dur: 0.18 }, // D5
  { note: 523.25, dur: 0.18 }, // C5
  { note: 440.0, dur: 0.18 },  // A4
  { note: 392.0, dur: 0.36 },  // G4 (long)
  { note: 0, dur: 0.36 },      // rest (gap before loop)
];

const LOOP_DURATION_S = MELODY.reduce((sum, s) => sum + s.dur, 0);

export function HostMusic({ isPlaying, volume = 0.15 }: HostMusicProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const activeRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  // Listen for any user interaction to unlock AudioContext
  useEffect(() => {
    const unlock = () => {
      ensureContext();
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, [ensureContext]);

  // Schedule one full loop of the melody
  const scheduleLoop = useCallback((ctx: AudioContext, master: GainNode) => {
    let t = ctx.currentTime + 0.05;

    for (const step of MELODY) {
      if (step.note > 0) {
        // Lead voice — triangle wave
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = step.note;
        osc.connect(env);
        env.connect(master);
        env.gain.setValueAtTime(0.001, t);
        env.gain.linearRampToValueAtTime(0.12, t + 0.015);
        env.gain.exponentialRampToValueAtTime(0.001, t + step.dur);
        osc.start(t);
        osc.stop(t + step.dur + 0.02);

        // Soft sub-harmony one octave lower
        const sub = ctx.createOscillator();
        const subEnv = ctx.createGain();
        sub.type = "sine";
        sub.frequency.value = step.note / 2;
        sub.connect(subEnv);
        subEnv.connect(master);
        subEnv.gain.setValueAtTime(0.001, t);
        subEnv.gain.linearRampToValueAtTime(0.04, t + 0.015);
        subEnv.gain.exponentialRampToValueAtTime(0.001, t + step.dur);
        sub.start(t);
        sub.stop(t + step.dur + 0.02);
      }
      t += step.dur;
    }
  }, []);

  // Start / stop music
  useEffect(() => {
    // Clear any pending loop
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!isPlaying) {
      activeRef.current = false;
      // Fade out
      if (gainRef.current && ctxRef.current && ctxRef.current.state === "running") {
        gainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 0.4);
      }
      return;
    }

    const ctx = ensureContext();
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    gainRef.current = master;
    activeRef.current = true;

    function loop() {
      if (!activeRef.current) return;
      scheduleLoop(ctx, master);
      timeoutRef.current = setTimeout(loop, (LOOP_DURATION_S - 0.1) * 1000);
    }

    loop();

    return () => {
      activeRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      setTimeout(() => {
        try { master.disconnect(); } catch {}
      }, 500);
    };
  }, [isPlaying, volume, ensureContext, scheduleLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return null;
}
