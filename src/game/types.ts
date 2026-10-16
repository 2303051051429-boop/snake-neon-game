// Shared types for SNAKE NEON engine + UI.

export type Direction = "up" | "down" | "left" | "right";

export interface Vec {
  x: number;
  y: number;
}

export type Phase = "menu" | "ready" | "playing" | "paused" | "gameover";

export type FoodKind = "normal" | "gold" | "purple" | "energy";

export type PowerKind = "overdrive" | "slowmo" | "shield" | "dbl";

export type Difficulty = "normal" | "hard";

export interface Settings {
  sound: boolean;
  music: boolean;
  shake: boolean;
  particles: boolean;
  reducedMotion: boolean;
  difficulty: Difficulty;
  dpad: boolean;
}

export interface PowerState {
  kind: PowerKind;
  remaining: number; // seconds (rounded to 0.1 for UI emission)
  duration: number; // Infinity for shield
}

export interface FoodItem {
  id: number;
  x: number;
  y: number;
  kind: FoodKind;
  power?: PowerKind;
  spawnAt: number; // engine-time seconds
  ttl?: number; // seconds until expiry (specials only)
}

export interface LeaderboardEntry {
  score: number;
  length: number;
  combo: number;
  date: number;
}

export interface PersistData {
  best: number;
  bestLength: number;
  bestCombo: number;
  board: LeaderboardEntry[];
  settings: Settings;
}

export interface RunResult {
  score: number;
  best: number;
  length: number;
  maxCombo: number;
  level: number;
  newBest: boolean;
  rank: number | null; // 1-based place within the local top-5, if it qualified
}

export interface Announcement {
  id: number;
  text: string;
  kind: "info" | "gold" | "power" | "danger";
}

/** Snapshot pushed from the engine to React when something meaningful changes. */
export interface UiState {
  phase: Phase;
  demo: boolean;
  score: number;
  best: number;
  length: number;
  level: number;
  speedPct: number; // 0–100 relative to max speed
  scoreNonce: number; // increments on every score change → retrigger pop animation
  combo: number;
  comboMult: number;
  comboNonce: number; // increments on every eat → restart combo drain animation
  powers: PowerState[];
  countdown: number; // 3..1 during ready, 0 = GO flash
  result: RunResult | null;
  announcement: Announcement | null;
}

export interface Popup {
  x: number; // grid coords (float)
  y: number;
  text: string;
  color: string;
  size: number; // css px font size
  life: number;
  ttl: number;
}
