"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type HostMusicProps = {
  isPlaying: boolean;
  volume?: number;
};

// Happy, bubbly elevator music (Muzak style)
// Soft sine/triangle waves, light chords, bossa-nova-ish bass
const BEAT = 0.45; // ~133 BPM

type Step = {
  note: number;
  bass: number;
  chord?: number[];
  dur: number;
};

const SEQUENCE: Step[] = [
  // Measure 1: Cmaj7
  { note: 659.25, bass: 130.81, chord: [329.63, 392.00, 493.88], dur: BEAT },
  { note: 0,      bass: 0,      chord: [329.63, 392.00, 493.88], dur: BEAT / 2 },
  { note: 783.99, bass: 196.00,                                  dur: BEAT / 2 },
  { note: 659.25, bass: 0,      chord: [329.63, 392.00, 493.88], dur: BEAT },
  { note: 523.25, bass: 196.00,                                  dur: BEAT },

  // Measure 2: Dmin7
  { note: 698.46, bass: 146.83, chord: [349.23, 440.00, 523.25], dur: BEAT },
  { note: 0,      bass: 0,      chord: [349.23, 440.00, 523.25], dur: BEAT / 2 },
  { note: 880.00, bass: 220.00,                                  dur: BEAT / 2 },
  { note: 698.46, bass: 0,      chord: [349.23, 440.00, 523.25], dur: BEAT },
  { note: 587.33, bass: 220.00,                                  dur: BEAT },

  // Measure 3: G7
  { note: 783.99, bass: 98.00,  chord: [349.23, 392.00, 493.88], dur: BEAT },
  { note: 0,      bass: 0,      chord: [349.23, 392.00, 493.88], dur: BEAT / 2 },
  { note: 698.46, bass: 146.83,                                  dur: BEAT / 2 },
  { note: 587.33, bass: 0,      chord: [349.23, 392.00, 493.88], dur: BEAT },
  { note: 493.88, bass: 146.83,                                  dur: BEAT },

  // Measure 4: Cmaj7
  { note: 523.25, bass: 130.81, chord: [329.63, 392.00, 493.88], dur: BEAT * 2 },
  { note: 0,      bass: 196.00,                                  dur: BEAT },
  { note: 0,      bass: 130.81, chord: [329.63, 392.00, 493.88], dur: BEAT },
];

const LOOP_DURATION_S = SEQUENCE.reduce((sum, s) => sum + s.dur, 0);

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

    for (const step of SEQUENCE) {
      // 1. Melody (bright, bubbly)
      if (step.note > 0) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = step.note;
        osc.connect(env);
        env.connect(master);
        env.gain.setValueAtTime(0.001, t);
        env.gain.linearRampToValueAtTime(0.1, t + 0.05);
        env.gain.exponentialRampToValueAtTime(0.001, t + step.dur * 0.8);
        osc.start(t);
        osc.stop(t + step.dur);
      }

      // 2. Bass (smooth, round)
      if (step.bass > 0) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = step.bass;
        osc.connect(env);
        env.connect(master);
        env.gain.setValueAtTime(0.001, t);
        env.gain.linearRampToValueAtTime(0.15, t + 0.05);
        env.gain.exponentialRampToValueAtTime(0.001, t + step.dur * 0.9);
        osc.start(t);
        osc.stop(t + step.dur);
      }

      // 3. Chords (soft background pad)
      if (step.chord) {
        for (const freq of step.chord) {
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          osc.connect(env);
          env.connect(master);
          env.gain.setValueAtTime(0.001, t);
          env.gain.linearRampToValueAtTime(0.04, t + 0.1);
          env.gain.exponentialRampToValueAtTime(0.001, t + step.dur * 0.9);
          osc.start(t);
          osc.stop(t + step.dur);
        }
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
