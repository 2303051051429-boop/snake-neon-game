// ---------------------------------------------------------------------------
// GameEngine — the heart of SNAKE NEON.
// Fixed-timestep simulation (frame-rate independent) + interpolated rendering.
// React receives batched UiState snapshots whenever something meaningful changes.
// ---------------------------------------------------------------------------

import { AudioManager } from "./audio";
import { comboMultiplier, CONFIG } from "./config";
import { FoodManager } from "./food";
import { InputManager } from "./input";
import { ParticleSystem } from "./particles";
import { BoardRenderer, type RenderFood, type RenderState, type TrailDot } from "./renderer";
import { Snake } from "./snake";
import { loadPersist, recordResult, saveSettings } from "./storage";
import type {
  Announcement,
  Direction,
  FoodItem,
  Phase,
  Popup,
  PowerKind,
  PowerState,
  RunResult,
  Settings,
  UiState,
  Vec,
} from "./types";
import { clamp, DIR_VEC, DIRS, hexA, lerp, manhattan, OPPOSITE } from "./utils";

const C = CONFIG.colors;
const GO_FLASH_SEC = 0.44;

const POWER_LABEL: Record<PowerKind, string> = {
  overdrive: "OVERDRIVE — SPEED + SCORE ×1.5",
  slowmo: "SLOW-MO — TIME DILATION",
  shield: "SHIELD ONLINE — ONE FREE HIT",
  dbl: "DOUBLE SCORE — ×2 POINTS",
};

export class GameEngine {
  private renderer: BoardRenderer;
  private snake = new Snake();
  private foods = new FoodManager();
  private parts = new ParticleSystem();
  private audio = new AudioManager();
  private input: InputManager;
  private wrap: HTMLElement;
  private ro: ResizeObserver | null = null;

  // phase / flow
  phase: Phase = "menu";
  private demo = true;
  private modalOpen = false;
  private settings: Settings;

  // grid
  private cols = 30;
  private rows = 20;

  // movement
  private dir: Direction = "right";
  private queued: Direction | null = null;
  private acc = 0;
  private alpha = 1;
  private selfGraceT = 0;

  // session stats
  private best = 0;
  private score = 0;
  private level = 1;
  private combo = 0;
  private maxCombo = 0;
  private lastEatAt = -Infinity;
  private comboNonce = 0;
  private scoreNonce = 0;
  private powers: PowerState[] = [];
  private result: RunResult | null = null;

  // timers
  private time = 0; // always-advancing render clock
  private lastTs = 0;
  private raf = 0;
  private readyT = 0;
  private countdown = 3;
  private lastCount = -1;
  private dying = false;
  private dieT = 0;
  private deathFlash = 0;
  private snakeAlpha = 1;
  private demoDeathT = 0;

  // juice
  private trauma = 0;
  private popups: Popup[] = [];
  private trail: TrailDot[] = [];
  private trailClock = 0;
  private eatPulse = 0;
  private flash = 0;
  private announceId = 0;
  private announcement: Announcement | null = null;
  private powerEmitClock = 0;

  // ui sync
  private uiLs = new Set<(u: UiState) => void>();
  private uiDirty = true;
  private ptsBuffer: Vec[] = [];

  constructor(canvas: HTMLCanvasElement, wrap: HTMLElement, settings: Settings) {
    this.wrap = wrap;
    this.renderer = new BoardRenderer(canvas);
    this.settings = settings;
    this.best = loadPersist().best;
    this.audio.setMuted(!settings.sound);
    this.input = new InputManager({
      dir: (d) => this.requestDirection(d),
      confirm: () => this.onConfirm(),
      escape: () => this.onEscape(),
      restart: () => this.onRestartKey(),
      any: () => this.audio.unlock(),
    });
  }

  /* ------------------------------------------------------------------ */
  /* lifecycle                                                           */
  /* ------------------------------------------------------------------ */

  mount(): void {
    this.enterMenu(); // snake + food must exist before any resize/ensureNormal runs
    this.handleResize();
    this.input.attach(this.wrap);

    this.ro = new ResizeObserver(() => this.handleResize());
    this.ro.observe(this.wrap);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("blur", this.onWindowBlur);

    this.lastTs = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("blur", this.onWindowBlur);
    this.input.detach();
    this.audio.destroy();
  }

  /* ------------------------------------------------------------------ */
  /* public API (used by React UI)                                        */
  /* ------------------------------------------------------------------ */

  onUi(fn: (u: UiState) => void): () => void {
    this.uiLs.add(fn);
    fn(this.snapshot());
    return () => this.uiLs.delete(fn);
  }

  setModal(open: boolean): void {
    this.modalOpen = open;
  }

  applySettings(s: Settings): void {
    this.settings = s;
    saveSettings(s);
    this.audio.setMuted(!s.sound);
    this.audio.setMusic(s.music);
    if (!s.particles) this.parts.clear();
  }

  uiClick(): void {
    this.audio.unlock();
    this.audio.click();
  }

  unlockAudio(): void {
    this.audio.unlock();
  }

  /** Called by the UI after wiping localStorage. */
  dataCleared(): void {
    this.best = 0;
    if (this.phase === "menu") {
      this.enterMenu();
    }
    this.markDirty();
  }

  start(): void {
    if (this.phase !== "menu" && this.phase !== "gameover") return;
    this.audio.unlock();
    this.resetRun();
    this.phase = "ready";
    this.readyT = 0;
    this.lastCount = -1;
    this.markDirty();
  }

  restart(): void {
    if (this.phase === "menu") return;
    this.audio.unlock();
    this.resetRun();
    this.phase = "ready";
    this.readyT = 0;
    this.lastCount = -1;
    this.markDirty();
  }

  pause(): void {
    if (this.phase !== "playing" || this.dying) return;
    this.phase = "paused";
    this.markDirty();
  }

  resume(): void {
    if (this.phase !== "paused") return;
    this.phase = "playing";
    this.markDirty();
  }

  toMenu(): void {
    if (this.phase === "menu") return;
    this.enterMenu();
    this.markDirty();
  }

  requestDirection(d: Direction): void {
    if (this.modalOpen) return;
    if (this.phase !== "playing" && this.phase !== "ready") return;
    if (this.dying) return;
    const base = this.queued ?? this.dir;
    if (d === base || d === OPPOSITE[base]) return;
    this.queued = d;
  }

  /* ------------------------------------------------------------------ */
  /* input callbacks                                                     */
  /* ------------------------------------------------------------------ */

  private onConfirm(): void {
    if (this.modalOpen) return;
    switch (this.phase) {
      case "playing":
        this.pause();
        break;
      case "paused":
        this.resume();
        break;
      case "menu":
        this.start();
        break;
      case "gameover":
        this.restart();
        break;
      default:
        break;
    }
  }

  private onEscape(): void {
    if (this.modalOpen) return; // panels handle their own ESC
    if (this.phase === "playing") this.pause();
    else if (this.phase === "paused") this.resume();
  }

  private onRestartKey(): void {
    if (this.modalOpen) return;
    if (this.phase === "gameover" || this.phase === "paused") this.restart();
  }

  private onVisibility = (): void => {
    if (document.hidden) this.pause();
  };

  private onWindowBlur = (): void => {
    this.pause();
  };

  /* ------------------------------------------------------------------ */
  /* sizing                                                              */
  /* ------------------------------------------------------------------ */

  private handleResize = (): void => {
    const rect = this.wrap.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const g = CONFIG.grid;
    const cols = clamp(Math.round(rect.width / g.targetCellCss), g.minCols, g.maxCols);
    const rows = clamp(Math.round(rect.height / g.targetCellCss), g.minRows, g.maxRows);
    const changed = cols !== this.cols || rows !== this.rows;
    this.cols = cols;
    this.rows = rows;
    this.renderer.resize(rect.width, rect.height, cols, rows);
    if (changed && this.snake.segs.length > 0) {
      this.snake.clampToBounds(cols, rows);
      this.foods.clampToBounds(cols, rows);
      this.selfGraceT = 0.7; // brief mercy window after geometry shifts
      if (!this.foods.hasKind("normal")) this.foods.ensureNormal(this.snake, cols, rows, this.time);
    }
  };

  /* ------------------------------------------------------------------ */
  /* run setup                                                           */
  /* ------------------------------------------------------------------ */

  private resetRun(): void {
    this.score = 0;
    this.level = 1;
    this.combo = 0;
    this.maxCombo = 0;
    this.lastEatAt = -Infinity;
    this.powers = [];
    this.popups = [];
    this.trail = [];
    this.parts.clear();
    this.dir = "right";
    this.queued = null;
    this.acc = 0;
    this.alpha = 1;
    this.dying = false;
    this.dieT = 0;
    this.deathFlash = 0;
    this.snakeAlpha = 1;
    this.eatPulse = 0;
    this.flash = 0;
    this.result = null;
    this.demo = false;
    this.countdown = 3;
    this.snake.reset(this.cols, this.rows);
    this.foods.reset();
    this.foods.ensureNormal(this.snake, this.cols, this.rows, this.time);
  }

  private enterMenu(): void {
    this.phase = "menu";
    this.demo = true;
    this.dying = false;
    this.demoDeathT = 0;
    this.snakeAlpha = 1;
    this.deathFlash = 0;
    this.powers = [];
    this.combo = 0;
    this.popups = [];
    this.result = null;
    this.dir = "right";
    this.queued = null;
    this.best = loadPersist().best;
    this.snake.reset(this.cols, this.rows);
    this.snake.grow(3); // juicier attract snake
    this.foods.reset();
    this.foods.ensureNormal(this.snake, this.cols, this.rows, this.time);
  }

  /* ------------------------------------------------------------------ */
  /* simulation                                                          */
  /* ------------------------------------------------------------------ */

  private baseSps(): number {
    const s = CONFIG.speed;
    return this.settings.difficulty === "hard" ? s.hardBase : s.base;
  }

  private maxSps(): number {
    return this.settings.difficulty === "hard" ? CONFIG.speed.hardMax : CONFIG.speed.max;
  }

  private currentSps(): number {
    if (this.demo) return CONFIG.speed.demo;
    let sps = Math.min(this.maxSps(), this.baseSps() + this.score * CONFIG.speed.perPoint);
    if (this.hasPower("slowmo")) sps *= CONFIG.speed.slowmoFactor;
    if (this.hasPower("overdrive")) sps *= CONFIG.speed.overdriveFactor;
    return sps;
  }

  private hasPower(kind: PowerKind): boolean {
    return this.powers.some((p) => p.kind === kind);
  }

  private simulate(dt: number): void {
    const sps = this.currentSps();
    const stepSec = 1 / sps;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= stepSec && steps < 6) {
      this.step();
      this.acc -= stepSec;
      steps++;
      if (this.dying || this.demoDeathT > 0) {
        this.acc = 0;
        break;
      }
    }
    if (steps === 6) this.acc = 0; // anti spiral-of-death
    this.alpha = clamp(this.acc / stepSec, 0, 1);
  }

  private step(): void {
    // autopilot for attract mode
    if (this.demo) this.autopilot();

    // apply buffered direction
    if (this.queued && this.queued !== OPPOSITE[this.dir]) {
      this.dir = this.queued;
    }
    this.queued = null;

    const v = DIR_VEC[this.dir];
    const head = this.snake.head;
    const nx = head.x + v.x;
    const ny = head.y + v.y;

    // --- collisions (logical grid — never interpolated pixels) ---
    const wallHit = this.snake.hitsWall(nx, ny, this.cols, this.rows);
    const selfHit = this.selfGraceT <= 0 && this.snake.hitsSelf(nx, ny);
    if (wallHit || selfHit) {
      if (this.demo) {
        this.demoDeath();
        return;
      }
      if (this.hasPower("shield") && this.shieldSave()) return;
      this.die();
      return;
    }

    this.snake.applyStep(nx, ny);

    // --- food pickup ---
    const item = this.foods.at(nx, ny);
    if (item) this.consume(item);

    // --- combo expiry ---
    if (this.combo > 0 && this.time - this.lastEatAt > CONFIG.combo.windowSec) {
      this.combo = 0;
      this.markDirty();
    }

    // --- special spawns + expiry (demo rolls with score 0 → normals only) ---
    const expired = this.foods.stepUpdate(this.snake, this.cols, this.rows, this.demo ? 0 : this.score, this.time);
    for (const f of expired) {
      if (this.settings.particles) {
        this.parts.burst(this.renderer.cellX(f.x), this.renderer.cellY(f.y), {
          count: 5,
          color: f.kind === "energy" && f.power ? C[f.power] : this.foodColor(f),
          speed: 50,
          size: 2,
          life: 0.4,
        });
      }
    }

    // --- level up ---
    if (!this.demo) {
      const newLevel = 1 + Math.floor(this.score / 100);
      if (newLevel > this.level) {
        this.level = newLevel;
        this.flash = 1;
        this.announce(`LEVEL ${newLevel} — SPEED UP`, "info");
        this.audio.levelUp();
        this.addTrauma(CONFIG.shake.level);
        const hp = this.rendererPoint(head.x, head.y);
        if (this.settings.particles) {
          this.parts.burst(hp.x, hp.y, {
            count: 26,
            color: [C.gold, C.normal, "#ffffff"],
            speed: 220,
            size: 3,
            life: 0.8,
          });
        }
        this.markDirty();
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* eating + powers                                                     */
  /* ------------------------------------------------------------------ */

  private foodColor(f: FoodItem): string {
    if (f.kind === "energy" && f.power) return C[f.power];
    return C[f.kind as "normal" | "gold" | "purple" | "energy"] ?? C.normal;
  }

  private rendererPoint(cx: number, cy: number): Vec {
    return { x: this.renderer.cellX(cx), y: this.renderer.cellY(cy) };
  }

  private consume(item: FoodItem): void {
    const p = this.rendererPoint(item.x, item.y);
    const color = this.foodColor(item);
    const big = item.kind !== "normal";

    // shared juice (demo also eats visually)
    this.eatPulse = 1;
    if (this.settings.particles) {
      this.parts.eatBurst(p.x, p.y, color, big);
    }
    this.snake.grow(CONFIG.growth[item.kind]);

    if (!this.demo) {
      // combo
      if (this.time - this.lastEatAt <= CONFIG.combo.windowSec) this.combo = Math.min(this.combo + 1, 99);
      else this.combo = 1;
      this.lastEatAt = this.time;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.comboNonce++;

      const mult = comboMultiplier(this.combo);
      const powerMult = (this.hasPower("dbl") ? 2 : 1) * (this.hasPower("overdrive") ? CONFIG.power.overdrive.scoreMult : 1);
      const diffMult = this.settings.difficulty === "hard" ? CONFIG.score.hardMultiplier : 1;
      const pts = Math.round(CONFIG.score[item.kind] * mult * powerMult * diffMult);
      this.score += pts;
      this.scoreNonce++;

      this.pushPopup(item.x, item.y, `+${pts}`, color, item.kind === "normal" ? 15 : 20);
      const shakeKey = item.kind === "energy" ? ("power" as const) : item.kind === "normal" ? ("eat" as const) : item.kind;
      this.addTrauma(CONFIG.shake[shakeKey]);

      if (item.kind === "normal") this.audio.eat(this.combo);
      else if (item.kind === "energy") this.audio.powerup();
      else this.audio.bonus(item.kind);

      if (item.kind === "energy" && item.power) this.grantPower(item.power);
    }

    this.foods.remove(item.id);
    if (item.kind === "normal") {
      this.foods.ensureNormal(this.snake, this.cols, this.rows, this.time);
    }
    this.markDirty();
  }

  private grantPower(kind: PowerKind): void {
    const duration = CONFIG.power[kind].durationSec;
    const existing = this.powers.find((pp) => pp.kind === kind);
    if (existing) existing.remaining = duration;
    else this.powers.push({ kind, remaining: duration, duration });
    this.announce(POWER_LABEL[kind], "power");
    this.markDirty();
  }

  /** Consume the shield and steer into a safe cell. Returns false if no safe cell exists. */
  private shieldSave(): boolean {
    const head = this.snake.head;
    const options = [this.dir, ...DIRS.filter((d) => d !== this.dir && d !== OPPOSITE[this.dir])];
    for (const d of options) {
      const v = DIR_VEC[d];
      if (!this.snake.wouldDie(head.x + v.x, head.y + v.y, this.cols, this.rows)) {
        this.powers = this.powers.filter((pp) => pp.kind !== "shield");
        this.dir = d;
        this.queued = null;
        const p = this.rendererPoint(head.x, head.y);
        this.pushPopup(head.x, head.y, "SHIELD SAVED!", C.shield, 16);
        this.addTrauma(CONFIG.shake.shield);
        this.audio.shieldPop();
        if (this.settings.particles) {
          this.parts.burst(p.x, p.y, { count: 26, color: [C.shield, "#ffffff"], speed: 200, size: 3, life: 0.6 });
        }
        this.markDirty();
        return true;
      }
    }
    return false; // no way out — death proceeds
  }

  /* ------------------------------------------------------------------ */
  /* death                                                               */
  /* ------------------------------------------------------------------ */

  private die(): void {
    this.dying = true;
    this.dieT = 0.85;
    this.combo = 0;
    this.addTrauma(CONFIG.shake.death);
    this.audio.death();

    if (this.settings.particles) {
      const segs = this.snake.segs;
      const stride = Math.max(1, Math.floor(segs.length / 110));
      for (let i = 0; i < segs.length; i += stride) {
        const s = segs[i]!;
        this.parts.burst(this.renderer.cellX(s.x), this.renderer.cellY(s.y), {
          count: 3,
          color: [C.snakeBodyA, C.snakeBodyB, "#ffffff"],
          speed: 150,
          size: 3,
          life: 0.9,
          grav: 60,
        });
      }
      const h = this.rendererPoint(segs[0]!.x, segs[0]!.y);
      this.parts.burst(h.x, h.y, { count: 30, color: [C.death, "#ffffff", C.gold], speed: 260, size: 3.6, life: 0.7 });
    }
  }

  private finalizeDeath(): void {
    this.dying = false;
    this.snakeAlpha = 0;
    const result = recordResult(this.score, this.snake.length, this.maxCombo, this.level);
    this.best = result.best;
    this.result = result;
    this.phase = "gameover";
    if (result.newBest) {
      this.audio.fanfare();
      const cx = this.renderer.ox + this.renderer.boardW / 2;
      const cy = this.renderer.oy + this.renderer.boardH / 2;
      if (this.settings.particles) {
        this.parts.burst(cx, cy, {
          count: 70,
          color: [C.gold, C.normal, C.energy, "#ffffff"],
          speed: 300,
          speedVar: 160,
          size: 3.6,
          life: 1.3,
          grav: 90,
        });
      }
    }
    this.markDirty();
  }

  private demoDeath(): void {
    this.demoDeathT = 0.62;
    this.deathFlash = 1;
    if (this.settings.particles) {
      const segs = this.snake.segs;
      for (let i = 0; i < segs.length; i += 2) {
        const s = segs[i]!;
        this.parts.burst(this.renderer.cellX(s.x), this.renderer.cellY(s.y), {
          count: 2,
          color: [C.snakeBodyA, "#ffffff"],
          speed: 120,
          size: 2.6,
          life: 0.7,
        });
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* autopilot (attract mode)                                            */
  /* ------------------------------------------------------------------ */

  private autopilot(): void {
    const head = this.snake.head;
    let target: Vec = { x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) };
    let bestD = Infinity;
    for (const f of this.foods.items) {
      const d = manhattan(head, f);
      if (d < bestD) {
        bestD = d;
        target = f;
      }
    }
    const safe = DIRS.filter((d) => {
      if (d === OPPOSITE[this.dir]) return false;
      const v = DIR_VEC[d];
      return !this.snake.wouldDie(head.x + v.x, head.y + v.y, this.cols, this.rows);
    });
    if (safe.length === 0) return; // accept fate — the crash looks cool anyway
    let pick: Direction = safe[0]!;
    let bestScore = Infinity;
    for (const d of safe) {
      const v = DIR_VEC[d];
      const dist = manhattan({ x: head.x + v.x, y: head.y + v.y }, target) + Math.random() * 0.45;
      if (dist < bestScore) {
        bestScore = dist;
        pick = d;
      }
    }
    // bypass the player-facing gate (menu phase ignores requestDirection)
    if (pick !== OPPOSITE[this.dir]) this.queued = pick;
  }

  /* ------------------------------------------------------------------ */
  /* juice helpers                                                       */
  /* ------------------------------------------------------------------ */

  private addTrauma(amount: number): void {
    if (!this.settings.shake || this.settings.reducedMotion) return;
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  private pushPopup(x: number, y: number, text: string, color: string, size: number): void {
    this.popups.push({ x, y, text, color, size, life: 0.85, ttl: 0.85 });
    if (this.popups.length > 14) this.popups.shift();
  }

  private announce(text: string, kind: Announcement["kind"]): void {
    this.announcement = { id: ++this.announceId, text, kind };
    this.markDirty();
  }

  /* ------------------------------------------------------------------ */
  /* frame loop                                                          */
  /* ------------------------------------------------------------------ */

  private frame = (ts: number): void => {
    const dtms = ts - this.lastTs;
    this.lastTs = ts;
    const dt = clamp(dtms / 1000, 0, 0.055);
    this.time += dt;

    const frozen = this.phase === "paused";

    if (!frozen) {
      // decay juice
      this.trauma = Math.max(0, this.trauma - CONFIG.shake.decay * dt);
      this.eatPulse = Math.max(0, this.eatPulse - dt * 2.4);
      this.flash = Math.max(0, this.flash - dt * 1.9);
      if (this.selfGraceT > 0) this.selfGraceT -= dt;

      // popups
      for (let i = this.popups.length - 1; i >= 0; i--) {
        const p = this.popups[i]!;
        p.life -= dt;
        if (p.life <= 0) this.popups.splice(i, 1);
      }
      // trail
      for (let i = this.trail.length - 1; i >= 0; i--) {
        const t = this.trail[i]!;
        t.life -= dt * 2.1;
        if (t.life <= 0) this.trail.splice(i, 1);
      }

      switch (this.phase) {
        case "menu":
          this.updateDemo(dt);
          break;
        case "ready":
          this.updateReady(dt);
          break;
        case "playing":
          this.updatePlaying(dt);
          break;
        case "gameover":
          this.parts.update(dt);
          break;
        default:
          break;
      }
    }

    // power timers tick in real time while playing
    if (this.phase === "playing" && !this.dying && this.powers.length > 0) {
      let changed = false;
      for (const p of this.powers) {
        if (Number.isFinite(p.remaining)) {
          p.remaining -= dt;
          if (p.remaining <= 0) changed = true;
        }
      }
      if (changed) {
        this.powers = this.powers.filter((p) => p.remaining > 0);
        this.markDirty();
      }
      this.powerEmitClock += dt;
      if (this.powerEmitClock >= 0.1) {
        this.powerEmitClock = 0;
        this.markDirty(); // refresh countdown rings in HUD
      }
    }

    // emit batched UI updates
    if (this.uiDirty) {
      this.uiDirty = false;
      this.emit();
    }

    // render
    const amp = Math.pow(this.trauma, 2) * CONFIG.shake.maxOffset;
    const shakeX = amp * Math.sin(this.time * 51.7);
    const shakeY = amp * Math.cos(this.time * 43.3);
    this.renderer.draw(this.buildRenderState(), shakeX, shakeY);

    this.raf = requestAnimationFrame(this.frame);
  };

  private updateDemo(dt: number): void {
    if (this.demoDeathT > 0) {
      this.demoDeathT -= dt;
      this.deathFlash = Math.max(0, this.demoDeathT * 1.8 - 0.4);
      this.snakeAlpha = clamp(this.demoDeathT / 0.62, 0, 1);
      this.parts.update(dt);
      if (this.demoDeathT <= 0) {
        this.snake.reset(this.cols, this.rows);
        this.snake.grow(3);
        this.dir = "right";
        this.queued = null;
        this.snakeAlpha = 1;
        this.deathFlash = 0;
        this.foods.reset();
        this.foods.ensureNormal(this.snake, this.cols, this.rows, this.time);
      }
      return;
    }
    this.parts.update(dt);
    this.simulate(dt);
    this.sampleTrail(dt);
  }

  private updateReady(dt: number): void {
    const cs = CONFIG.ready.countSeconds;
    this.readyT += dt;
    const idx = Math.floor(this.readyT / cs);
    const count = clamp(CONFIG.ready.counts - idx, 0, CONFIG.ready.counts);
    if (count !== this.lastCount) {
      this.lastCount = count;
      this.countdown = count;
      this.audio.countdown(count === 0);
      this.markDirty();
    }
    if (this.readyT >= CONFIG.ready.counts * cs + GO_FLASH_SEC) {
      this.phase = "playing";
      this.acc = 0;
      this.markDirty();
    }
  }

  private updatePlaying(dt: number): void {
    if (this.dying) {
      this.dieT -= dt;
      this.deathFlash = this.dieT > 0.45 ? 1 : Math.max(0, this.dieT * 2.4);
      this.parts.update(dt);
      if (this.dieT <= 0) this.finalizeDeath();
      return;
    }
    this.parts.update(dt);
    this.simulate(dt);
    this.sampleTrail(dt);
  }

  private sampleTrail(dt: number): void {
    this.trailClock += dt;
    if (this.trailClock < 0.034 || this.snake.segs.length === 0) return;
    this.trailClock = 0;
    const head = this.snake.segs[0]!;
    const prev = this.snake.prev[0] ?? head;
    this.trail.push({
      x: lerp(prev.x, head.x, this.alpha),
      y: lerp(prev.y, head.y, this.alpha),
      life: 1,
    });
    if (this.trail.length > 24) this.trail.shift();
  }

  private buildRenderState(): RenderState {
    const foods: RenderFood[] = this.foods.items.map((f) => ({
      cx: f.x,
      cy: f.y,
      phase: f.id * 1.73,
      pulse: this.time,
      expireFrac: f.ttl !== undefined ? clamp(1 - (this.time - f.spawnAt) / f.ttl, 0, 1) : -1,
      kind: f.kind,
      power: f.power,
    }));

    let tint: string | null = null;
    if (this.hasPower("overdrive")) tint = hexA(C.overdrive, 0.1);
    else if (this.hasPower("slowmo")) tint = hexA(C.slowmo, 0.1);
    else if (this.hasPower("dbl")) tint = hexA(C.dbl, 0.08);
    else if (this.hasPower("shield")) tint = hexA(C.shield, 0.05);

    return {
      time: this.time,
      demo: this.phase === "menu",
      snakePts: this.snake.renderPoints(this.alpha, this.ptsBuffer),
      headDir: this.dir,
      snakeAlpha: this.snakeAlpha,
      deathFlash: this.deathFlash,
      eatPulse: this.eatPulse,
      flash: this.flash,
      borderPulse: this.flash,
      foods,
      popups: this.popups,
      trail: this.trail,
      particles: this.parts,
      tint,
    };
  }

  /* ------------------------------------------------------------------ */
  /* UI snapshot                                                         */
  /* ------------------------------------------------------------------ */

  private markDirty(): void {
    this.uiDirty = true;
  }

  private emit(): void {
    const s = this.snapshot();
    for (const fn of this.uiLs) fn(s);
  }

  private snapshot(): UiState {
    return {
      phase: this.phase,
      demo: this.demo,
      score: this.score,
      best: Math.max(this.best, this.score),
      length: this.snake.length,
      level: this.level,
      speedPct: Math.round(clamp(this.currentSps() / this.maxSps(), 0, 1) * 100),
      scoreNonce: this.scoreNonce,
      combo: this.combo,
      comboMult: comboMultiplier(Math.max(1, this.combo)),
      comboNonce: this.comboNonce,
      powers: this.powers.map((p) => ({
        kind: p.kind,
        remaining: Number.isFinite(p.remaining) ? Math.max(0, Math.round(p.remaining * 10) / 10) : Infinity,
        duration: p.duration,
      })),
      countdown: this.countdown,
      result: this.result,
      announcement: this.announcement,
    };
  }
}
