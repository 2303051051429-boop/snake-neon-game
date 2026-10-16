import { useEffect, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Shield, Sparkles, Timer, X, Zap } from "lucide-react";
import { cn } from "@/utils/cn";
import type { PowerKind } from "@/game/types";

/* ------------------------------------------------------------------ */
/* power-up metadata shared across HUD / panels                         */
/* ------------------------------------------------------------------ */

export const POWER_META: Record<PowerKind, { label: string; color: string; Icon: LucideIcon }> = {
  overdrive: { label: "Overdrive", color: "#ff9d2e", Icon: Zap },
  slowmo: { label: "Slow-Mo", color: "#41c9ff", Icon: Timer },
  shield: { label: "Shield", color: "#3dffce", Icon: Shield },
  dbl: { label: "Double Score", color: "#ff4de3", Icon: Sparkles },
};

/* ------------------------------------------------------------------ */
/* buttons                                                             */
/* ------------------------------------------------------------------ */

type BtnVariant = "primary" | "ghost" | "gold" | "danger";
type BtnSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLS: Record<BtnSize, string> = {
  sm: "px-4 h-9 text-[10px]",
  md: "px-5 h-11 text-xs",
  lg: "px-7 h-[52px] text-sm",
  xl: "px-8 sm:px-10 h-14 sm:h-16 text-sm sm:text-base",
};

const ICON_SIZE: Record<BtnSize, number> = { sm: 14, md: 16, lg: 18, xl: 20 };

export function NeonButton({
  variant = "primary",
  size = "md",
  icon: Icon,
  children,
  className,
  onClick,
  disabled,
  ariaLabel,
  full,
}: {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "btn font-bold uppercase",
        variant === "primary" && "btn-primary",
        variant === "ghost" && "btn-ghost border",
        variant === "gold" && "btn-gold",
        variant === "danger" && "btn-danger border",
        SIZE_CLS[size],
        full && "w-full",
        disabled && "opacity-40 pointer-events-none",
        className,
      )}
    >
      {Icon && <Icon size={ICON_SIZE[size]} strokeWidth={2.4} />}
      <span>{children}</span>
    </button>
  );
}

export function IconBtn({
  icon: Icon,
  onClick,
  ariaLabel,
  className,
  size = 44,
  active,
}: {
  icon: LucideIcon;
  onClick?: () => void;
  ariaLabel: string;
  className?: string;
  size?: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={cn(
        "btn-ghost border btn rounded-xl inline-flex items-center justify-center",
        active && "border-neon-cyan/70 text-neon-cyan",
        className,
      )}
    >
      <Icon size={size * 0.42} strokeWidth={2.2} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* chip + stat                                                         */
/* ------------------------------------------------------------------ */

export function Chip({
  icon: Icon,
  label,
  value,
  tone = "text-neon-cyan",
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value?: ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={cn("chip px-3 py-1.5 text-[10px] text-slate-300", className)}>
      {Icon && <Icon size={13} className={tone} />}
      <span className="text-slate-400">{label}</span>
      {value !== undefined && <span className={cn("font-bold", tone)}>{value}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* toggle switch row                                                   */
/* ------------------------------------------------------------------ */

export function ToggleRow({
  icon: Icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
    >
      <span className="grid size-9 flex-none place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-neon-cyan">
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-100">{label}</span>
        {desc && <span className="block truncate text-[11px] text-slate-400">{desc}</span>}
      </span>
      <span className="tgl" data-on={checked} aria-hidden="true" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* modal shell                                                         */
/* ------------------------------------------------------------------ */

export function Modal({
  title,
  icon: Icon,
  onClose,
  children,
  maxW = "max-w-md",
}: {
  title: string;
  icon: LucideIcon;
  onClose: () => void;
  children: ReactNode;
  maxW?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-ui-modal="true">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="anim-fade-in absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("anim-panel-in glass relative w-full rounded-2xl p-5 sm:p-6", maxW)}
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
            <Icon size={17} />
          </span>
          <h2 className="font-display text-sm font-bold tracking-[0.22em] text-slate-100 uppercase">{title}</h2>
          <div className="flex-1" />
          <IconBtn icon={X} ariaLabel="Close" onClick={onClose} size={36} />
        </div>
        <div className="divider-neon mb-4" />
        {children}
      </div>
    </div>
  );
}
