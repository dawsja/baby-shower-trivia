"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type HostMusicProps = {
  isPlaying: boolean;
  volume?: number;
};

// Tense, ticking trivia countdown melody — builds urgency
// Uses minor/suspended intervals for that "clock is ticking" feel
const MELODY = [
  // Tick-tock pulse intro
  { note: 587.33, dur: 0.15 }, // D5 (tick)
  { note: 0, dur: 0.10 },      // rest
  { note: 440.0, dur: 0.15 },  // A4 (tock)
  { note: 0, dur: 0.10 },      // rest
  { note: 587.33, dur: 0.15 }, // D5
  { note: 0, dur: 0.10 },      // rest
  { note: 440.0, dur: 0.15 },  // A4
  { note: 0, dur: 0.10 },      // rest

  // Rising tension phrase
  { note: 523.25, dur: 0.12 }, // C5
  { note: 587.33, dur: 0.12 }, // D5
  { note: 659.25, dur: 0.12 }, // E5
  { note: 698.46, dur: 0.24 }, // F5 (hold)
  { note: 0, dur: 0.08 },      // rest

  // Tick-tock pulse
  { note: 659.25, dur: 0.15 }, // E5
  { note: 0, dur: 0.10 },      // rest
  { note: 493.88, dur: 0.15 }, // B4
  { note: 0, dur: 0.10 },      // rest
  { note: 659.25, dur: 0.15 }, // E5
  { note: 0, dur: 0.10 },      // rest
  { note: 493.88, dur: 0.15 }, // B4
  { note: 0, dur: 0.10 },      // rest

  // Climax phrase — higher urgency
  { note: 698.46, dur: 0.12 }, // F5
  { note: 783.99, dur: 0.12 }, // G5
  { note: 880.0, dur: 0.12 },  // A5
  { note: 783.99, dur: 0.12 }, // G5
  { note: 698.46, dur: 0.24 }, // F5 (hold)
  { note: 0, dur: 0.08 },      // rest

  // Descending resolve
  { note: 659.25, dur: 0.12 }, // E5
  { note: 587.33, dur: 0.12 }, // D5
  { note: 523.25, dur: 0.12 }, // C5
  { note: 493.88, dur: 0.30 }, // B4 (sustained)
  { note: 0, dur: 0.30 },      // rest before loop
];

const LOOP_DURATION_S = MELODY.reduce((sum, s) => sum + s.dur, 0);

export function HostMusic({ isPlaying, volume = 0.15 }: HostMusicProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const activeRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const ensureContext = useCallback(async () => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      await ctxRef.current.resume().catch((err) => {
        console.debug("AudioContext resume blocked (autoplay policy):", err);
      });
    }
    return ctxRef.current;
  }, []);

  // Schedule one full loop of the melody
  const scheduleLoop = useCallback((ctx: AudioContext, master: GainNode) => {
    let t = ctx.currentTime + 0.05;

    for (const step of MELODY) {
      if (step.note > 0) {
        // Lead — square wave for that retro game-show bite
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = step.note;
        osc.connect(env);
        env.connect(master);
        env.gain.setValueAtTime(0.001, t);
        env.gain.linearRampToValueAtTime(0.06, t + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, t + step.dur);
        osc.start(t);
        osc.stop(t + step.dur + 0.02);

        // Soft tick layer — higher octave, very quiet, adds clock feel
        const tick = ctx.createOscillator();
        const tickEnv = ctx.createGain();
        tick.type = "sine";
        tick.frequency.value = step.note * 2;
        tick.connect(tickEnv);
        tickEnv.connect(master);
        tickEnv.gain.setValueAtTime(0.001, t);
        tickEnv.gain.linearRampToValueAtTime(0.015, t + 0.005);
        tickEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        tick.start(t);
        tick.stop(t + 0.08);
      }
      t += step.dur;
    }
  }, []);

  // Start / stop music
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!isPlaying) {
      activeRef.current = false;
      if (gainRef.current && ctxRef.current && ctxRef.current.state === "running") {
        gainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 0.4);
      }
      setAudioBlocked(false);
      return;
    }

    activeRef.current = true;

    (async () => {
      const ctx = await ensureContext();

      // Effect was cleaned up while we were awaiting (e.g. isPlaying changed)
      if (!activeRef.current) return;

      // Browser blocked audio — no user gesture has occurred yet
      if (ctx.state !== "running") {
        setAudioBlocked(true);
        return;
      }

      setAudioBlocked(false);
      const master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      gainRef.current = master;

      function loop() {
        if (!activeRef.current) return;
        scheduleLoop(ctx, master);
        timeoutRef.current = setTimeout(loop, (LOOP_DURATION_S - 0.1) * 1000);
      }

      loop();
    })();

    return () => {
      activeRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (gainRef.current && ctxRef.current && ctxRef.current.state === "running") {
        const g = gainRef.current;
        const t = ctxRef.current.currentTime;
        g.gain.linearRampToValueAtTime(0, t + 0.4);
        setTimeout(() => {
          try { g.disconnect(); } catch {}
        }, 500);
      }
    };
    // audioBlocked is intentionally in the dep array: when the user clicks the
    // "enable sound" overlay it flips to false, which re-triggers this effect
    // so music starts immediately without any additional state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, volume, ensureContext, scheduleLoop, audioBlocked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  if (audioBlocked && isPlaying) {
    return (
      <div
        className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/60"
        onClick={async () => {
          await ensureContext();
          setAudioBlocked(false);
        }}
      >
        <div className="rounded-2xl bg-white/20 px-8 py-6 text-center backdrop-blur-sm">
          <p className="text-3xl">🔊</p>
          <p className="mt-2 text-xl font-bold text-white">Click anywhere to enable sound</p>
        </div>
      </div>
    );
  }

  return null;
}
