import { useState } from "react";
import {
  Accessibility,
  Activity,
  Crown,
  Flame,
  Gamepad2,
  Ghost,
  Music,
  Sparkles,
  Trash2,
  Trophy,
  Volume2,
  Ruler,
  Settings as SettingsIcon,
} from "lucide-react";
import { loadPersist } from "@/game/storage";
import type { Settings } from "@/game/types";
import { formatScore } from "@/game/utils";
import { cn } from "@/utils/cn";
import { Modal, ToggleRow } from "./ui-kit";

/* ------------------------------------------------------------------ */
/* SETTINGS                                                            */
/* ------------------------------------------------------------------ */

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClearData: () => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onChange, onClearData, onClose }: SettingsPanelProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <Modal title="Settings" icon={SettingsIcon} onClose={onClose}>
      <div className="max-h-[62dvh] space-y-1 overflow-y-auto pr-1 scroll-thin">
        <ToggleRow
          icon={Volume2}
          label="Sound effects"
          desc="Synthesized arcade blips"
          checked={settings.sound}
          onChange={(v) => onChange({ sound: v })}
        />
        <ToggleRow
          icon={Music}
          label="Music"
          desc="Ambient synth pad (subtle)"
          checked={settings.music}
          onChange={(v) => onChange({ music: v })}
        />
        <ToggleRow
          icon={Activity}
          label="Screen shake"
          desc="Impacts and death hits"
          checked={settings.shake}
          onChange={(v) => onChange({ shake: v })}
        />
        <ToggleRow
          icon={Sparkles}
          label="Particles"
          desc="Bursts, sparks and debris"
          checked={settings.particles}
          onChange={(v) => onChange({ particles: v })}
        />
        <ToggleRow
          icon={Accessibility}
          label="Reduced motion"
          desc="Tames shake and effects"
          checked={settings.reducedMotion}
          onChange={(v) => onChange({ reducedMotion: v })}
        />
        <ToggleRow
          icon={Gamepad2}
          label="On-screen D-pad"
          desc="Shown during play on touch devices"
          checked={settings.dpad}
          onChange={(v) => onChange({ dpad: v })}
        />

        <div className="pt-3">
          <div className="px-2 pb-2 text-[10px] font-bold tracking-[0.24em] text-slate-400 uppercase">
            Difficulty
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["normal", "hard"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChange({ difficulty: d })}
                className={cn(
                  "btn h-11 rounded-xl border font-display text-[11px] font-bold tracking-[0.2em] uppercase",
                  settings.difficulty === d
                    ? d === "hard"
                      ? "border-neon-red/70 bg-neon-red/15 text-neon-red shadow-[0_0_18px_-6px_rgba(255,77,106,0.7)]"
                      : "border-neon-green/70 bg-neon-green/15 text-neon-green shadow-[0_0_18px_-6px_rgba(61,255,135,0.7)]"
                    : "border-white/12 bg-white/[0.03] text-slate-400 hover:border-white/30",
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="mt-2 px-1 text-[11px] text-slate-500">
            Hard mode: faster snake, +25% score bonus. Applies on the next run.
          </p>
        </div>

        <div className="pt-4">
          <button
            type="button"
            onClick={() => {
              if (confirmClear) {
                onClearData();
                setConfirmClear(false);
              } else {
                setConfirmClear(true);
                window.setTimeout(() => setConfirmClear(false), 2600);
              }
            }}
            className={cn(
              "btn w-full justify-center gap-2 rounded-xl border px-4 py-2.5 font-display text-[10px] font-bold tracking-[0.2em] uppercase",
              confirmClear ? "btn-danger" : "border-white/12 bg-white/[0.03] text-slate-400 hover:border-neon-red/50 hover:text-neon-red",
            )}
          >
            <Trash2 size={14} />
            {confirmClear ? "Tap again to confirm wipe" : "Clear local data"}
          </button>
          <p className="mt-2 text-center text-[10px] tracking-[0.14em] text-slate-600 uppercase">
            Snake Neon v1.0 — stored locally in this browser
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* HIGH SCORES                                                         */
/* ------------------------------------------------------------------ */

const RANK_STYLE = [
  "border-neon-gold/70 bg-neon-gold/15 text-neon-gold shadow-[0_0_14px_-4px_rgba(255,209,102,0.8)]",
  "border-slate-300/50 bg-slate-300/10 text-slate-200",
  "border-amber-600/60 bg-amber-600/10 text-amber-500",
];

export function ScoresPanel({ onClose }: { onClose: () => void }) {
  const [data] = useState(() => loadPersist());
  const top = data.board;
  const maxScore = top[0]?.score ?? 1;

  return (
    <Modal title="High scores" icon={Trophy} onClose={onClose}>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-[9px] font-bold tracking-[0.18em] text-slate-500 uppercase">
            <Trophy size={10} className="text-neon-gold" /> Best
          </div>
          <div className="font-display text-base font-extrabold text-neon-gold tabular-nums">
            {formatScore(data.best)}
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-[9px] font-bold tracking-[0.18em] text-slate-500 uppercase">
            <Ruler size={10} className="text-neon-cyan" /> Length
          </div>
          <div className="font-display text-base font-extrabold text-neon-cyan tabular-nums">{data.bestLength}</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-[9px] font-bold tracking-[0.18em] text-slate-500 uppercase">
            <Flame size={10} className="text-neon-orange" /> Combo
          </div>
          <div className="font-display text-base font-extrabold text-neon-orange tabular-nums">
            {data.bestCombo}×
          </div>
        </div>
      </div>

      {top.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="grid size-14 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-slate-500">
            <Ghost size={22} />
          </span>
          <p className="text-sm text-slate-400">No runs recorded yet.</p>
          <p className="text-[11px] text-slate-500">Play a round and set the first record.</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {top.map((e, i) => (
            <li
              key={`${e.date}-${i}`}
              className="relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] p-3"
            >
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-neon-cyan/15 to-transparent"
                style={{ width: `${Math.max(6, (e.score / maxScore) * 100)}%` }}
              />
              <div className="relative flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-9 flex-none place-items-center rounded-lg border font-display text-xs font-extrabold",
                    RANK_STYLE[i] ?? "border-white/12 bg-white/[0.04] text-slate-400",
                  )}
                >
                  {i === 0 ? <Crown size={15} /> : `#${i + 1}`}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-extrabold text-white tabular-nums">
                    {formatScore(e.score)}
                  </div>
                  <div className="text-[10px] tracking-[0.12em] text-slate-500 uppercase">
                    Len {e.length} · Combo {e.combo}× ·{" "}
                    {new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-center text-[10px] tracking-[0.16em] text-slate-600 uppercase">
        Local leaderboard — top 5 runs
      </p>
    </Modal>
  );
}
