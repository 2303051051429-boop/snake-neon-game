import { useEffect, useRef, useState } from "react";
import { GameEngine } from "@/game/engine";
import { clearAllData, loadPersist } from "@/game/storage";
import type { Direction, Settings, UiState } from "@/game/types";
import { cn } from "@/utils/cn";
import { BackgroundFx } from "./BackgroundFx";
import { Dpad } from "./Dpad";
import { Hud } from "./Hud";
import { MainMenu } from "./MainMenu";
import { CountdownOverlay, GameOverOverlay, PauseOverlay } from "./Overlays";
import { ScoresPanel, SettingsPanel } from "./Panels";

type PanelName = "settings" | "scores" | null;

const ANNOUNCE_TONE: Record<string, string> = {
  info: "border-neon-cyan/50 text-neon-cyan text-glow-cyan",
  gold: "border-neon-gold/60 text-neon-gold text-glow-gold",
  power: "border-neon-pink/60 text-neon-pink",
  danger: "border-neon-red/60 text-neon-red text-glow-red",
};

export default function GameShell() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [ui, setUi] = useState<UiState | null>(null);
  const [settings, setSettings] = useState<Settings>(() => loadPersist().settings);
  const [panel, setPanel] = useState<PanelName>(null);
  const [isTouch] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );

  /* engine lifecycle */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const engine = new GameEngine(canvas, wrap, loadPersist().settings);
    engineRef.current = engine;
    const unsub = engine.onUi(setUi);
    engine.mount();
    const unlock = () => engine.unlockAudio();
    window.addEventListener("pointerdown", unlock);
    return () => {
      unsub();
      window.removeEventListener("pointerdown", unlock);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  /* settings sync → engine + persistence */
  useEffect(() => {
    engineRef.current?.applySettings(settings);
  }, [settings]);

  /* modal gate (game ignores keys while a panel is open) */
  useEffect(() => {
    engineRef.current?.setModal(panel !== null);
  }, [panel]);

  const eng = () => engineRef.current;
  const clicked = (fn: () => void) => () => {
    eng()?.uiClick();
    fn();
  };
  const patchSettings = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  const clearData = () => {
    clearAllData();
    setSettings(loadPersist().settings);
    eng()?.dataCleared();
  };

  const phase = ui?.phase ?? "menu";
  const inRun = phase === "ready" || phase === "playing" || phase === "paused";
  const showDpad = isTouch && settings.dpad && inRun;

  return (
    <div
      className={cn(
        "relative h-dvh w-screen overflow-hidden bg-[#030510] text-slate-200",
        settings.reducedMotion && "reduced-motion",
      )}
    >
      <BackgroundFx />

      {/* board — padded for HUD + D-pad while a run is active */}
      <div
        className="absolute inset-x-1 sm:inset-x-2"
        style={{
          top: inRun ? 78 : 4,
          bottom: showDpad ? 152 : 10,
        }}
      >
        <div ref={wrapRef} className="relative h-full w-full" style={{ touchAction: "none" }}>
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="Snake Neon game board" />
        </div>
      </div>

      {/* HUD */}
      {ui && inRun && <Hud ui={ui} onPause={clicked(() => eng()?.pause())} />}

      {/* announcements */}
      {ui?.announcement && inRun && phase === "playing" && (
        <div key={ui.announcement.id} className="pointer-events-none absolute left-1/2 top-[88px] z-20 -translate-x-1/2">
          <div
            className={cn(
              "anim-toast glass chip px-4 py-2 font-display text-[11px] font-bold tracking-[0.18em] whitespace-nowrap uppercase",
              ANNOUNCE_TONE[ui.announcement.kind] ?? ANNOUNCE_TONE.info,
            )}
          >
            {ui.announcement.text}
          </div>
        </div>
      )}

      {/* screens by phase */}
      {ui && phase === "menu" && (
        <MainMenu
          ui={ui}
          sound={settings.sound}
          isTouch={isTouch}
          onStart={clicked(() => eng()?.start())}
          onScores={clicked(() => setPanel("scores"))}
          onSettings={clicked(() => setPanel("settings"))}
          onToggleSound={() => patchSettings({ sound: !settings.sound })}
        />
      )}
      {ui && phase === "ready" && <CountdownOverlay count={ui.countdown} isTouch={isTouch} />}
      {ui && phase === "paused" && (
        <PauseOverlay
          ui={ui}
          onResume={clicked(() => eng()?.resume())}
          onRestart={clicked(() => eng()?.restart())}
          onMenu={clicked(() => eng()?.toMenu())}
        />
      )}
      {ui && phase === "gameover" && (
        <GameOverOverlay
          ui={ui}
          onRestart={clicked(() => eng()?.restart())}
          onMenu={clicked(() => eng()?.toMenu())}
        />
      )}

      {/* virtual d-pad */}
      {showDpad && (
        <div
          className="absolute left-1/2 z-30 -translate-x-1/2"
          style={{ bottom: "max(14px, env(safe-area-inset-bottom))" }}
        >
          <Dpad onDir={(d: Direction) => eng()?.requestDirection(d)} />
        </div>
      )}

      {/* modals */}
      {panel === "settings" && (
        <SettingsPanel
          settings={settings}
          onChange={patchSettings}
          onClearData={clearData}
          onClose={clicked(() => setPanel(null))}
        />
      )}
      {panel === "scores" && <ScoresPanel onClose={clicked(() => setPanel(null))} />}

      {/* screen-reader announcements */}
      <div aria-live="polite" className="sr-only">
        {ui?.announcement?.text ?? ""}
      </div>
    </div>
  );
}
