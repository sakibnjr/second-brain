import { BrainCircuit } from "lucide-react";

interface BrandWordmarkProps {
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  className?: string;
}

export function BrandWordmark({
  size = "md",
  subtitle = "Offline OS",
  className = "",
}: BrandWordmarkProps) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  const iconBoxSize = isSm ? "w-8 h-8 rounded-lg" : isLg ? "w-11 h-11 rounded-2xl" : "w-9 h-9 rounded-xl";
  const iconSize = isSm ? "w-4 h-4" : isLg ? "w-6 h-6" : "w-5 h-5";
  const titleSize = isSm ? "text-xs" : isLg ? "text-lg" : "text-sm";
  const subSize = isSm ? "text-[8px]" : "text-[9px]";

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Neural Brain Mark */}
      <div
        className={`relative ${iconBoxSize} bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 border border-white/10 ring-1 ring-indigo-400/20 shrink-0 group`}
      >
        <BrainCircuit
          className={`${iconSize} text-white drop-shadow-sm group-hover:scale-105 transition-transform duration-200`}
        />
        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#0A0D14]" />
      </div>

      {/* Typographic Lockup */}
      <div className="flex flex-col">
        <div className="flex items-center tracking-tight leading-none">
          <span className={`${titleSize} font-extrabold text-white tracking-tight`}>
            Second
          </span>
          <span
            className={`${titleSize} font-extrabold bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-300 bg-clip-text text-transparent ml-1`}
          >
            Brain
          </span>
        </div>
        {subtitle && (
          <span
            className={`${subSize} font-mono font-medium text-[#94A3B8] tracking-wider uppercase mt-1`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
