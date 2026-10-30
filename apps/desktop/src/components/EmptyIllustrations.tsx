export function TaskEmptyIllustration() {
  return (
    <svg
      className="w-24 h-24 mx-auto mb-3"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="60" cy="60" r="50" fill="#EEF2FF" className="dark:fill-blue-950/30" />
      {/* Clipboard base */}
      <rect x="36" y="28" width="48" height="64" rx="8" fill="#FFFFFF" className="dark:fill-slate-800" stroke="#CBD5E1" strokeWidth="2" />
      {/* Clip top */}
      <rect x="48" y="22" width="24" height="12" rx="4" fill="#3B82F6" />
      <circle cx="60" cy="28" r="2.5" fill="#FFFFFF" />
      {/* Checkmarks & lines */}
      <circle cx="48" cy="46" r="4.5" fill="#10B981" />
      <path d="M46 46L47.5 47.5L50.5 44.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="57" y="44" width="20" height="4" rx="2" fill="#E2E8F0" className="dark:fill-slate-700" />
      
      <circle cx="48" cy="60" r="4.5" fill="#3B82F6" />
      <path d="M46 60L47.5 61.5L50.5 58.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="57" y="58" width="16" height="4" rx="2" fill="#E2E8F0" className="dark:fill-slate-700" />

      <circle cx="48" cy="74" r="4.5" fill="#E2E8F0" className="dark:fill-slate-700" />
      <rect x="57" y="72" width="18" height="4" rx="2" fill="#E2E8F0" className="dark:fill-slate-700" />
      {/* Sparkles */}
      <path d="M92 34L94 28L96 34L102 36L96 38L94 44L92 38L86 36L92 34Z" fill="#FBBF24" />
      <path d="M22 66L23 62L25 66L29 67L25 68L23 72L22 68L18 67L22 66Z" fill="#38BDF8" />
    </svg>
  );
}

export function LearningEmptyIllustration() {
  return (
    <svg
      className="w-24 h-24 mx-auto mb-3"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="60" cy="60" r="50" fill="#ECFDF5" className="dark:fill-emerald-950/30" />
      {/* Book base left */}
      <path
        d="M30 48C38 46 54 44 60 48V82C54 78 38 76 30 78V48Z"
        fill="#0D9488"
      />
      {/* Book base right */}
      <path
        d="M90 48C82 46 66 44 60 48V82C66 78 82 76 90 78V48Z"
        fill="#14B8A6"
      />
      {/* Book pages spine */}
      <path d="M60 48V82" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      {/* Bookmark ribbon */}
      <path d="M72 46V64L76 61L80 64V46" fill="#F59E0B" />
      {/* Graduation Cap floating */}
      <path d="M60 22L84 32L60 40L36 32L60 22Z" fill="#1E293B" className="dark:fill-slate-200" />
      <path d="M48 37V47C48 51 72 51 72 47V37" fill="#334155" className="dark:fill-slate-400" />
      <path d="M84 32V44" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="84" cy="45" r="2" fill="#F59E0B" />
      {/* Glowing Star */}
      <path d="M26 34L28 29L30 34L35 35L30 37L28 42L26 37L21 35L26 34Z" fill="#10B981" />
    </svg>
  );
}

export function IdeaEmptyIllustration() {
  return (
    <svg
      className="w-24 h-24 mx-auto mb-3"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="60" cy="60" r="50" fill="#FFFBEB" className="dark:fill-amber-950/30" />
      {/* Lightbulb glass */}
      <path
        d="M60 28C47.85 28 38 37.85 38 50C38 57.6 41.8 64.3 47.6 68.2C49.1 69.2 50 71 50 72.8V75H70V72.8C70 71 70.9 69.2 72.4 68.2C78.2 64.3 82 57.6 82 50C82 37.85 72.15 28 60 28Z"
        fill="#FBBF24"
      />
      {/* Inner highlight */}
      <path
        d="M50 36C45 40 43 46 44 52"
        stroke="#FEF3C7"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Filament */}
      <path
        d="M54 52L58 46L62 52L66 46"
        stroke="#D97706"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bulb screw base */}
      <rect x="50" y="77" width="20" height="4" rx="2" fill="#94A3B8" />
      <rect x="52" y="83" width="16" height="4" rx="2" fill="#64748B" />
      <path d="M56 89H64C64 91 60 93 60 93C60 93 56 91 56 89Z" fill="#475569" />
      {/* Rays */}
      <line x1="60" y1="16" x2="60" y2="22" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="26" x2="36" y2="30" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      <line x1="88" y1="26" x2="84" y2="30" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      <line x1="22" y1="50" x2="28" y2="50" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      <line x1="92" y1="50" x2="98" y2="50" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function CalendarEmptyIllustration() {
  return (
    <svg
      className="w-24 h-24 mx-auto mb-3"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="60" cy="60" r="50" fill="#F0FDF4" className="dark:fill-emerald-950/30" />
      {/* Calendar body */}
      <rect x="34" y="32" width="52" height="56" rx="10" fill="#FFFFFF" className="dark:fill-slate-800" stroke="#CBD5E1" strokeWidth="2" />
      {/* Top bar */}
      <path d="M34 42C34 36.4772 38.4772 32 44 32H76C81.5228 32 86 36.4772 86 42V46H34V42Z" fill="#3B82F6" />
      {/* Rings */}
      <rect x="46" y="26" width="4" height="10" rx="2" fill="#1E293B" className="dark:fill-slate-300" />
      <rect x="70" y="26" width="4" height="10" rx="2" fill="#1E293B" className="dark:fill-slate-300" />
      {/* Dates dots/boxes */}
      <circle cx="48" cy="56" r="3" fill="#E2E8F0" className="dark:fill-slate-700" />
      <circle cx="60" cy="56" r="3" fill="#E2E8F0" className="dark:fill-slate-700" />
      <circle cx="72" cy="56" r="3" fill="#E2E8F0" className="dark:fill-slate-700" />
      <circle cx="48" cy="68" r="3" fill="#E2E8F0" className="dark:fill-slate-700" />
      <circle cx="60" cy="68" r="4.5" fill="#10B981" />
      <circle cx="72" cy="68" r="3" fill="#E2E8F0" className="dark:fill-slate-700" />
    </svg>
  );
}
