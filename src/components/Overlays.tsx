import { Crown, Flame, Home, Pause, Play, RotateCcw, Skull, Trophy } from "lucide-react";
import type { UiState } from "@/game/types";
import { formatScore } from "@/game/utils";
import { cn } from "@/utils/cn";
import { NeonButton } from "./ui-kit";

/* ------------------------------------------------------------------ */
/* READY countdown                                                     */
/* ------------------------------------------------------------------ */

export function CountdownOverlay({ count, isTouch }: { count: number; isTouch: boolean }) {
  const go = count === 0;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center">
      <div className="mb-2 font-display text-[11px] font-bold tracking-[0.5em] text-cyan-300/80 uppercase">
        {go ? "" : "Get ready"}
      </div>
      <div
        key={count}
        className={cn(
          "anim-count-pop font-display text-8xl font-black sm:text-9xl",
          go ? "text-neon-green text-glow-green" : "text-white",
        )}
        style={!go ? { textShadow: "0 0 18px rgba(60,232,255,0.7), 0 0 60px rgba(60,232,255,0.35)" } : undefined}
      >
        {go ? "GO!" : count}
      </div>
      <div className="mt-6 text-[10px] tracking-[0.3em] text-slate-400 uppercase">
        {isTouch ? "Swipe to steer" : "Arrows / WASD to steer"}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PAUSED                                                              */
/* ------------------------------------------------------------------ */

interface PauseProps {
  ui: UiState;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export function PauseOverlay({ ui, onResume, onRestart, onMenu }: PauseProps) {
  return (
    <div className="anim-fade-in absolute inset-0 z-30 flex items-center justify-center bg-[#02040c]/60 p-4 backdrop-blur-md">
      <div className="anim-panel-in glass w-full max-w-[340px] rounded-2xl p-6 text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Pause size={20} />
        </div>
        <h2 className="font-display text-2xl font-black tracking-[0.18em] text-white text-glow-cyan uppercase">
          Paused
        </h2>
        <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase">
          <span>
            Score <span className="text-neon-green tabular-nums">{formatScore(ui.score)}</span>
          </span>
          <span>
            Len <span className="text-neon-cyan tabular-nums">{ui.length}</span>
          </span>
          <span>
            Lvl <span className="text-neon-purple tabular-nums">{ui.level}</span>
          </span>
        </div>
        <div className="mt-6 flex flex-col gap-2.5">
          <NeonButton size="lg" icon={Play} onClick={onResume} full>
            Resume
          </NeonButton>
          <NeonButton variant="ghost" size="md" icon={RotateCcw} onClick={onRestart} full>
            Restart
          </NeonButton>
          <NeonButton variant="ghost" size="md" icon={Home} onClick={onMenu} full>
            Main menu
          </NeonButton>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-[9px] tracking-[0.2em] text-slate-500 uppercase">
          <span className="kbd">SPACE</span> resume
          <span className="kbd">R</span> restart
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* GAME OVER                                                           */
/* ------------------------------------------------------------------ */

interface GameOverProps {
  ui: UiState;
  onRestart: () => void;
  onMenu: () => void;
}

function StatTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[9px] font-bold tracking-[0.22em] text-slate-500 uppercase">{label}</div>
      <div className={cn("font-display text-xl font-extrabold tabular-nums", tone)}>{value}</div>
    </div>
  );
}

export function GameOverOverlay({ ui, onRestart, onMenu }: GameOverProps) {
  const r = ui.result;
  if (!r) return null;
  return (
    <div className="anim-fade-in absolute inset-0 z-30 flex items-center justify-center bg-[#02040c]/55 p-4 backdrop-blur-sm">
      <div className="anim-panel-in glass w-full max-w-[380px] rounded-2xl p-6 text-center">
        {r.newBest && (
          <div className="anim-pop-in mx-auto -mt-11 mb-3 flex w-fit items-center gap-2 rounded-full border border-neon-gold/60 bg-[#1a1204] px-4 py-2 font-display text-[11px] font-extrabold tracking-[0.2em] text-neon-gold text-glow-gold uppercase shadow-[0_0_30px_-4px_rgba(255,209,102,0.7)]">
            <Crown size={15} /> New high score
          </div>
        )}
        <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full border border-neon-red/40 bg-neon-red/10 text-neon-red">
          <Skull size={20} />
        </div>
        <h2 className="font-display text-3xl font-black tracking-[0.14em] text-neon-red text-glow-red uppercase">
          Game over
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <StatTile label="Final score" value={formatScore(r.score)} tone="text-neon-green text-glow-green" />
          <StatTile label="Best" value={formatScore(r.best)} tone="text-neon-gold" />
          <StatTile label="Length" value={String(r.length)} tone="text-neon-cyan" />
          <StatTile label="Max combo" value={`${r.maxCombo}×`} tone="text-neon-purple" />
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.18em] uppercase">
          <span className="chip px-3 py-1.5 text-slate-400">
            <Flame size={11} className="text-neon-orange" /> Level {r.level}
          </span>
          {r.rank && (
            <span className="chip glass-bright px-3 py-1.5 text-neon-gold">
              <Trophy size={11} /> Local rank #{r.rank}
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <NeonButton size="lg" icon={RotateCcw} onClick={onRestart} full>
            Play again
          </NeonButton>
          <NeonButton variant="ghost" size="md" icon={Home} onClick={onMenu} full>
            Main menu
          </NeonButton>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-[9px] tracking-[0.2em] text-slate-500 uppercase">
          <span className="kbd">R</span> quick restart
        </div>
      </div>
    </div>
  );
}
