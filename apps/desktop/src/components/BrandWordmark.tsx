import { APP_NAME, APP_TAGLINE } from "../lib/brand";

interface BrandWordmarkProps {
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  className?: string;
}

/** Second Brain logo mark (generated icon asset) + wordmark lockup. */
export function BrandWordmark({
  size = "md",
  subtitle = APP_TAGLINE,
  className = "",
}: BrandWordmarkProps) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  const logoSize = isSm ? "w-8 h-8" : isLg ? "w-12 h-12" : "w-10 h-10";
  const titleSize = isSm ? "text-xs" : isLg ? "text-base" : "text-[13px]";
  const subSize = isSm ? "text-[10px]" : "text-[11px]";

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <img
        src="/logo.png"
        alt={APP_NAME}
        draggable={false}
        className={`${logoSize} rounded-[22%] shrink-0 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.6)] ring-1 ring-white/10`}
      />
      <div className="flex flex-col justify-center">
        <span className={`${titleSize} font-bold text-white tracking-[-0.02em] leading-none`}>
          {APP_NAME}
        </span>
        <p className={`${subSize} font-medium text-[#94A3B8] tracking-normal mt-1.5`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
