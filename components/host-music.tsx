"use client";

import { useEffect, useRef, useState } from "react";

type HostMusicProps = {
  isPlaying: boolean;
  volume?: number;
};

export function HostMusic({ isPlaying, volume = 0.3 }: HostMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate a simple MIDI-like tune using Web Audio API
  useEffect(() => {
    if (!isPlaying || !audioRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = volume;

    // Simple cheerful melody notes (C major scale)
    const melody = [
      { freq: 261.63, duration: 200 }, // C4
      { freq: 293.66, duration: 200 }, // D4
      { freq: 329.63, duration: 200 }, // E4
      { freq: 261.63, duration: 200 }, // C4
      { freq: 349.23, duration: 200 }, // F4
      { freq: 392.00, duration: 200 }, // G4
      { freq: 349.23, duration: 200 }, // F4
      { freq: 261.63, duration: 400 }, // C4
    ];

    let noteIndex = 0;
    let intervalId: NodeJS.Timeout;

    const playNote = () => {
      const note = melody[noteIndex];
      const oscillator = audioContext.createOscillator();
      const noteGain = audioContext.createGain();
      
      oscillator.connect(noteGain);
      noteGain.connect(gainNode);
      
      oscillator.frequency.value = note.freq;
      oscillator.type = "sine";
      
      noteGain.gain.setValueAtTime(0, audioContext.currentTime);
      noteGain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + note.duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + note.duration / 1000);
      
      noteIndex = (noteIndex + 1) % melody.length;
    };

    if (isPlaying) {
      // Play first note immediately
      playNote();
      // Then play notes in a loop
      intervalId = setInterval(playNote, 250);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (audioContext) audioContext.close();
    };
  }, [isPlaying, volume]);

  return null; // No visual component needed
}
