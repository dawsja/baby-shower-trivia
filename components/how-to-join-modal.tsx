"use client";

import { X, Globe, Hash } from "lucide-react";

interface HowToJoinModalProps {
  code: string;
  onClose: () => void;
}

export function HowToJoinModal({ code, onClose }: HowToJoinModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card-glass relative w-full max-w-sm p-6 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-center text-2xl font-black text-slate-800">How to Join</h2>
        <p className="mt-1 text-center text-sm text-slate-500">Share these steps with your guests</p>

        <ol className="mt-5 space-y-4">
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
              1
            </span>
            <div>
              <p className="font-semibold text-slate-700">Open the URL on your phone</p>
              <a
                href="https://trivia.dawson.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="label-row mt-1 text-sm"
              >
                <Globe className="h-3.5 w-3.5" />
                trivia.dawson.id
              </a>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
              2
            </span>
            <div>
              <p className="font-semibold text-slate-700">Enter the join code</p>
              <p className="label-row mt-1 text-sm">
                <Hash className="h-3.5 w-3.5" />
                <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-mono text-base font-black tracking-widest text-blue-700">
                  {code}
                </span>
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
              3
            </span>
            <div>
              <p className="font-semibold text-slate-700">Enter your name &amp; start playing!</p>
            </div>
          </li>
        </ol>

        <button onClick={onClose} className="btn-secondary mt-6 w-full">
          Got it
        </button>
      </div>
    </div>
  );
}
