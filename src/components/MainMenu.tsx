import {
  Gauge,
  Gamepad2,
  Keyboard,
  Play,
  Settings as SettingsIcon,
  Smartphone,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import type { UiState } from "@/game/types";
import { formatScore } from "@/game/utils";
import { IconBtn, NeonButton } from "./ui-kit";

interface MenuProps {
  ui: UiState;
  sound: boolean;
  isTouch: boolean;
  onStart: () => void;
  onScores: () => void;
  onSettings: () => void;
  onToggleSound: () => void;
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Zap; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 flex-none place-items-center rounded-lg border border-neon-cyan/25 bg-neon-cyan/10 text-neon-cyan">
        <Icon size={15} />
      </span>
      <div>
        <div className="font-display text-[11px] font-bold tracking-[0.18em] text-slate-100">{title}</div>
        <div className="text-[11px] leading-snug text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

export function MainMenu({ ui, sound, isTouch, onStart, onScores, onSettings, onToggleSound }: MenuProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col">
      {/* top row */}
      <div className="flex items-start justify-between px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="pointer-events-auto">
          <div className="glass glass-bright chip px-4 py-2 text-[10px]">
            <Trophy size={14} className="text-neon-gold" />
            <span className="text-slate-400">High score</span>
            <span className="text-base font-extrabold text-neon-gold text-glow-gold tabular-nums">
              {formatScore(ui.best)}
            </span>
          </div>
        </div>
        <div className="pointer-events-auto">
          <IconBtn
            icon={sound ? Volume2 : VolumeX}
            ariaLabel={sound ? "Mute sound" : "Enable sound"}
            onClick={onToggleSound}
            size={44}
          />
        </div>
      </div>

      {/* title block */}
      <div className="flex flex-1 flex-col items-center justify-start px-4 pt-[7dvh] text-center sm:pt-[8dvh]">
        <div className="anim-rise mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.5em] text-cyan-300/80 uppercase">
          <span className="divider-neon w-8" />
          Cyber arcade protocol
          <span className="divider-neon w-8" />
        </div>
        <h1
          className="title-sheen font-display font-black tracking-[0.08em] uppercase"
          style={{ fontSize: "clamp(2.7rem, 9.5vw, 5.6rem)", lineHeight: 1.02 }}
        >
          Snake&nbsp;Neon
        </h1>
        <p className="mt-3 font-display text-[10px] font-semibold tracking-[0.42em] text-slate-300/80 uppercase sm:text-xs">
          Eat <span className="text-neon-green">✦</span> Grow <span className="text-neon-purple">✦</span> Beat your best
        </p>

        <div className="pointer-events-auto mt-8 flex flex-col items-center gap-4 sm:mt-10">
          <NeonButton size="xl" icon={Play} onClick={onStart} className="anim-pulse-soft min-w-[240px]">
            Start game
          </NeonButton>
          <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] text-slate-400 uppercase">
            {isTouch ? (
              <span className="inline-flex items-center gap-2">
                <Smartphone size={13} className="text-neon-cyan" /> Swipe or use the D-pad
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Keyboard size={13} className="text-neon-cyan" />
                <span className="kbd">↑</span>
                <span className="kbd">←</span>
                <span className="kbd">↓</span>
                <span className="kbd">→</span>
                <span className="text-slate-500">/</span>
                <span className="kbd">W</span>
                <span className="kbd">A</span>
                <span className="kbd">S</span>
                <span className="kbd">D</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* bottom actions */}
      <div className="pointer-events-auto flex items-center justify-center gap-3 px-4 pb-5 sm:pb-6">
        <NeonButton variant="ghost" size="md" icon={Trophy} onClick={onScores}>
          High scores
        </NeonButton>
        <NeonButton variant="ghost" size="md" icon={SettingsIcon} onClick={onSettings}>
          Settings
        </NeonButton>
      </div>

      {/* left panel — how to play */}
      <aside className="anim-panel-in pointer-events-auto absolute left-6 top-1/2 hidden w-[248px] -translate-y-1/2 xl:block">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display text-[11px] font-bold tracking-[0.24em] text-neon-cyan uppercase">
            <Gamepad2 size={14} /> How to play
          </h3>
          <p className="text-[12px] leading-relaxed text-slate-300/90">
            Eat the energy orbs, grow your snake, avoid the walls and yourself — and beat your highest score.
          </p>
          <div className="divider-neon my-4" />
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                <Keyboard size={12} className="text-neon-green" /> Keyboard
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="kbd">↑</span>
                <span className="kbd">←</span>
                <span className="kbd">↓</span>
                <span className="kbd">→</span>
                <span className="text-[10px] text-slate-500">or</span>
                <span className="kbd">W</span>
                <span className="kbd">A</span>
                <span className="kbd">S</span>
                <span className="kbd">D</span>
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                <Smartphone size={12} className="text-neon-purple" /> Touch
              </div>
              <p className="text-[11px] text-slate-400">Swipe in any direction to steer.</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="kbd">SPACE</span> pause
              <span className="kbd">R</span> restart
            </div>
          </div>
        </div>
      </aside>

      {/* right panel — features */}
      <aside className="anim-panel-in pointer-events-auto absolute right-6 top-1/2 hidden w-[248px] -translate-y-1/2 xl:block">
        <div className="glass space-y-4 rounded-2xl p-5">
          <Feature icon={Zap} title="Fast & smooth" desc="60 FPS gameplay, frame-rate independent." />
          <Feature icon={Sparkles} title="Beautiful effects" desc="Neon glow, particles and screen shake." />
          <Feature icon={Trophy} title="Track your score" desc="Local top-5 leaderboard, saved offline." />
          <Feature icon={Gauge} title="Rising challenge" desc="Speed ramps up as your score climbs." />
        </div>
      </aside>
    </div>
  );
}
