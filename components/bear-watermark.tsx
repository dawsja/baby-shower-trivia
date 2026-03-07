export function BearWatermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden"
    >
      <svg
        viewBox="0 0 400 440"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[70vh] max-h-[600px] w-auto text-white/[0.04]"
      >
        {/* Left ear */}
        <circle cx="120" cy="90" r="55" />
        <circle cx="120" cy="90" r="35" />
        {/* Right ear */}
        <circle cx="280" cy="90" r="55" />
        <circle cx="280" cy="90" r="35" />
        {/* Head */}
        <ellipse cx="200" cy="200" rx="140" ry="135" />
        {/* Inner face / muzzle */}
        <ellipse cx="200" cy="240" rx="70" ry="55" />
        {/* Left eye */}
        <circle cx="155" cy="185" r="12" fill="currentColor" />
        <circle cx="159" cy="181" r="4" className="text-white/[0.06]" fill="currentColor" />
        {/* Right eye */}
        <circle cx="245" cy="185" r="12" fill="currentColor" />
        <circle cx="249" cy="181" r="4" className="text-white/[0.06]" fill="currentColor" />
        {/* Nose */}
        <ellipse cx="200" cy="225" rx="16" ry="11" fill="currentColor" />
        {/* Mouth */}
        <path d="M200 236 Q200 256 185 254" />
        <path d="M200 236 Q200 256 215 254" />
        {/* Body */}
        <ellipse cx="200" cy="385" rx="115" ry="55" />
        {/* Left arm */}
        <path d="M105 355 Q60 390 75 420" strokeWidth="2" />
        {/* Right arm */}
        <path d="M295 355 Q340 390 325 420" strokeWidth="2" />
      </svg>
    </div>
  );
}
