import { Flame, Gauge, Pause, Ruler, Trophy } from "lucide-react";
import { CONFIG } from "@/game/config";
import type { UiState } from "@/game/types";
import { formatScore } from "@/game/utils";
import { cn } from "@/utils/cn";
import { IconBtn, POWER_META } from "./ui-kit";

export function Hud({ ui, onPause }: { ui: UiState; onPause: () => void }) {
  const frac = (remaining: number, duration: number) =>
    Number.isFinite(duration) ? Math.max(0, Math.min(1, remaining / duration)) : 1;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
      {/* scrim */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />

      <div className="relative flex items-start justify-between gap-2 px-3 pt-3 sm:px-5 sm:pt-4">
        {/* score block */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <div>
              <div className="font-display text-[9px] font-semibold tracking-[0.3em] text-cyan-300/70">
                SCORE
              </div>
              <div
                key={ui.scoreNonce}
                className="anim-score-pop font-display text-3xl font-extrabold tracking-wider text-neon-green text-glow-green tabular-nums sm:text-4xl"
                aria-live="off"
              >
                {formatScore(ui.score)}
              </div>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[10px] font-semibold tracking-[0.18em] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Trophy size={11} className="text-neon-gold" />
              <span className={cn("tabular-nums", ui.score >= ui.best && ui.best > 0 && "text-neon-gold text-glow-gold")}>
                {formatScore(ui.best)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Ruler size={11} className="text-neon-cyan" />
              {ui.length}
            </span>
          </div>
        </div>

        {/* combo (center) */}
        <div className="absolute left-1/2 top-3 -translate-x-1/2 sm:top-4">
          {ui.combo >= 2 && (
            <div key={ui.comboNonce} className="anim-pop-in flex flex-col items-center">
              <div className="chip glass-bright px-3 py-1.5 text-[11px] text-amber-200">
                <Flame size={13} className="text-neon-orange" />
                <span className="font-bold text-white">{ui.combo}×</span>
                <span className="text-amber-300/90">MULTI {ui.comboMult.toFixed(1)}</span>
              </div>
              <div className="mt-1 h-[3px] w-24 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full w-full origin-left rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
                  style={{
                    animation: `drain ${CONFIG.combo.windowSec}s linear forwards`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* right cluster */}
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="hidden flex-col items-end gap-1 sm:flex">
            <div className="chip px-3 py-1.5 text-[10px]">
              <span className="text-slate-400">LVL</span>
              <span className="font-bold text-neon-purple tabular-nums">{ui.level}</span>
            </div>
            <div className="chip px-3 py-1.5 text-[10px]">
              <Gauge size={12} className="text-neon-cyan" />
              <span className="font-bold text-neon-cyan tabular-nums">{ui.speedPct}%</span>
            </div>
          </div>
          <IconBtn icon={Pause} ariaLabel="Pause game" onClick={onPause} size={44} className="pointer-events-auto" />
        </div>
      </div>

      {/* active power-up badges */}
      {ui.powers.length > 0 && (
        <div className="relative mt-2 flex gap-2 px-3 sm:px-5">
          {ui.powers.map((p) => {
            const meta = POWER_META[p.kind];
            const f = frac(p.remaining, p.duration);
            const Icon = meta.Icon;
            return (
              <div
                key={p.kind}
                className="anim-pop-in flex flex-col items-center gap-1"
                title={`${meta.label}${Number.isFinite(p.duration) ? ` — ${p.remaining.toFixed(1)}s` : ""}`}
              >
                <div
                  className="grid size-10 place-items-center rounded-full p-[3px]"
                  style={{
                    background: `conic-gradient(${meta.color} ${f * 360}deg, rgba(255,255,255,0.08) 0deg)`,
                    boxShadow: `0 0 14px -4px ${meta.color}`,
                  }}
                >
                  <div className="grid size-full place-items-center rounded-full bg-[#070d1e]">
                    <Icon size={16} style={{ color: meta.color }} />
                  </div>
                </div>
                <span className="text-[8px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
