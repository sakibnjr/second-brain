interface BrandWordmarkProps {
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  className?: string;
}

/**
 * Second Brain - Precision Crafted Brand Mark & Typography
 * Designed with geometric neural symmetry, dual-cortex architecture, and high-fidelity obsidian styling.
 */
export function BrandWordmark({
  size = "md",
  subtitle = "Workspace",
  className = "",
}: BrandWordmarkProps) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  const boxSize = isSm ? "w-8 h-8 rounded-lg" : isLg ? "w-11 h-11 rounded-2xl" : "w-9 h-9 rounded-xl";
  const svgSize = isSm ? 18 : isLg ? 26 : 22;
  const titleSize = isSm ? "text-xs" : isLg ? "text-base" : "text-[13px]";
  const subSize = isSm ? "text-[8px]" : "text-[9px]";

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Engineered Obsidian Mark Tile */}
      <div
        className={`relative ${boxSize} bg-[#0D121F] border border-white/10 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.6)] flex items-center justify-center shrink-0 overflow-hidden group transition-all duration-300 hover:border-blue-500/40 hover:shadow-[0_4px_20px_-2px_rgba(59,130,246,0.3)]`}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.25),transparent_70%)] pointer-events-none" />

        {/* Custom Geometric Neural Cortex SVG */}
        <svg
          width={svgSize}
          height={svgSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            {/* Primary Neural Gradient: Electric Cobalt to Cyan */}
            <linearGradient id="sb-neural-left" x1="3" y1="4" x2="11" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="sb-neural-right" x1="13" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
            {/* Synaptic Bridge Gradient */}
            <linearGradient id="sb-bridge" x1="8" y1="12" x2="16" y2="12" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#A5B4FC" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
          </defs>

          {/* Left Hemisphere - Geometric Cognitive Loop */}
          <path
            d="M10 5.5C7.23858 5.5 5 7.73858 5 10.5C5 12.0835 5.73686 13.4947 6.89204 14.4145C6.34005 15.3402 6.02381 16.4253 6.02381 17.5833C6.02381 19.4703 7.5535 21 9.44048 21C10.0212 21 10.5694 20.8552 11.0494 20.6"
            stroke="url(#sb-neural-left)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Right Hemisphere - Mirrored Geometric Loop */}
          <path
            d="M14 5.5C16.7614 5.5 19 7.73858 19 10.5C19 12.0835 18.2631 13.4947 17.108 14.4145C17.66 15.3402 17.9762 16.4253 17.9762 17.5833C17.9762 19.4703 16.4465 21 14.5595 21C13.9788 21 13.4306 20.8552 12.9506 20.6"
            stroke="url(#sb-neural-right)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Precision Synaptic Nodes & Bridges */}
          {/* Upper Bridge (Logic & Focus) */}
          <line
            x1="9.5"
            y1="8.5"
            x2="14.5"
            y2="8.5"
            stroke="url(#sb-bridge)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Central Core Connection */}
          <line
            x1="8"
            y1="13"
            x2="16"
            y2="13"
            stroke="url(#sb-bridge)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Active Synapse Spark */}
          <circle cx="12" cy="13" r="1.6" fill="#F8FAFC" />
          <circle cx="12" cy="13" r="2.8" stroke="#38BDF8" strokeWidth="0.8" opacity="0.6" />
        </svg>

        {/* Precision Bevel Rim */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      </div>

      {/* Senior Designer Typographic Lockup */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`${titleSize} font-bold text-white tracking-[-0.02em]`}>
            Second Brain
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            PRO
          </span>
        </div>
        <p className={`${subSize} font-mono font-medium text-[#64748B] tracking-wide uppercase mt-1 flex items-center gap-1.5`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{subtitle}</span>
        </p>
      </div>
    </div>
  );
}
