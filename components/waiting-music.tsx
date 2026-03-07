"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type WaitingMusicProps = {
  isPlaying: boolean;
  volume?: number;
};

// Happy, upbeat baby-shower waiting jingle — bright and fun
// Uses C major for cheerful, welcoming warmth (vs the tense countdown melody)
const MELODY = [
  // Opening fanfare — happy ascending arpeggio
  { note: 523.25, dur: 0.10 }, // C5
  { note: 0,      dur: 0.04 }, // rest
  { note: 659.25, dur: 0.10 }, // E5
  { note: 0,      dur: 0.04 }, // rest
  { note: 783.99, dur: 0.10 }, // G5
  { note: 0,      dur: 0.04 }, // rest
  { note: 1046.50, dur: 0.20 }, // C6 — big happy leap!
  { note: 0,       dur: 0.12 }, // rest

  // Bouncy stepwise dance phrase
  { note: 783.99, dur: 0.10 }, // G5
  { note: 880.00, dur: 0.10 }, // A5
  { note: 783.99, dur: 0.10 }, // G5
  { note: 659.25, dur: 0.10 }, // E5
  { note: 0,      dur: 0.06 }, // rest
  { note: 587.33, dur: 0.10 }, // D5
  { note: 659.25, dur: 0.10 }, // E5
  { note: 523.25, dur: 0.18 }, // C5 (hold)
  { note: 0,      dur: 0.12 }, // rest

  // Playful skip phrase
  { note: 659.25, dur: 0.10 }, // E5
  { note: 0,      dur: 0.04 }, // rest
  { note: 783.99, dur: 0.10 }, // G5
  { note: 0,      dur: 0.04 }, // rest
  { note: 659.25, dur: 0.08 }, // E5
  { note: 783.99, dur: 0.08 }, // G5
  { note: 1046.50, dur: 0.18 }, // C6 (hold)
  { note: 0,       dur: 0.12 }, // rest

  // Twirling descent
  { note: 880.00, dur: 0.10 }, // A5
  { note: 783.99, dur: 0.10 }, // G5
  { note: 659.25, dur: 0.10 }, // E5
  { note: 523.25, dur: 0.10 }, // C5
  { note: 0,      dur: 0.10 }, // rest

  // Happy sign-off
  { note: 523.25, dur: 0.10 }, // C5
  { note: 659.25, dur: 0.10 }, // E5
  { note: 783.99, dur: 0.10 }, // G5
  { note: 659.25, dur: 0.10 }, // E5
  { note: 783.99, dur: 0.22 }, // G5 (triumphant hold)
  { note: 0,      dur: 0.20 }, // rest before loop
];

const LOOP_DURATION_S = MELODY.reduce((sum, s) => sum + s.dur, 0);

export function WaitingMusic({ isPlaying, volume = 0.15 }: WaitingMusicProps) {
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
        // Lead — triangle wave for bright, warm, flute-like tone (cheerful vs tense square)
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = step.note;
        osc.connect(env);
        env.connect(master);
        env.gain.setValueAtTime(0.001, t);
        env.gain.linearRampToValueAtTime(0.08, t + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, t + step.dur);
        osc.start(t);
        osc.stop(t + step.dur + 0.02);

        // Soft harmonic layer — sine wave at perfect fifth, adds warmth and brightness
        const harm = ctx.createOscillator();
        const harmEnv = ctx.createGain();
        harm.type = "sine";
        harm.frequency.value = step.note * 1.5;
        harm.connect(harmEnv);
        harmEnv.connect(master);
        harmEnv.gain.setValueAtTime(0.001, t);
        harmEnv.gain.linearRampToValueAtTime(0.018, t + 0.008);
        harmEnv.gain.exponentialRampToValueAtTime(0.001, t + step.dur * 0.7);
        harm.start(t);
        harm.stop(t + step.dur);
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
          <p className="text-3xl">🎵</p>
          <p className="mt-2 text-xl font-bold text-white">Click anywhere to enable sound</p>
        </div>
      </div>
    );
  }

  return null;
}
