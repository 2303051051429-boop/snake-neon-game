import { CONFIG } from "./config";
import type { LeaderboardEntry, PersistData, RunResult, Settings } from "./types";

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function defaultSettings(): Settings {
  return {
    sound: true,
    music: false,
    shake: true,
    particles: true,
    reducedMotion: prefersReducedMotion(),
    difficulty: "normal",
    dpad: true,
  };
}

function defaults(): PersistData {
  return {
    best: 0,
    bestLength: 0,
    bestCombo: 0,
    board: [],
    settings: defaultSettings(),
  };
}

function isValidSettings(s: unknown): s is Partial<Settings> {
  return typeof s === "object" && s !== null;
}

/** Safe load — never throws; always returns a complete PersistData. */
export function loadPersist(): PersistData {
  const base = defaults();
  try {
    const raw = window.localStorage.getItem(CONFIG.storageKey);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<PersistData> | null;
    if (!parsed || typeof parsed !== "object") return base;

    const settings = isValidSettings(parsed.settings)
      ? { ...base.settings, ...parsed.settings }
      : base.settings;

    return {
      best: Number.isFinite(parsed.best) ? Math.max(0, Math.floor(parsed.best as number)) : 0,
      bestLength: Number.isFinite(parsed.bestLength) ? Math.max(0, Math.floor(parsed.bestLength as number)) : 0,
      bestCombo: Number.isFinite(parsed.bestCombo) ? Math.max(0, Math.floor(parsed.bestCombo as number)) : 0,
      board: Array.isArray(parsed.board)
        ? (parsed.board as LeaderboardEntry[])
            .filter((e) => e && Number.isFinite(e.score))
            .slice(0, 5)
            .map((e) => ({
              score: Math.floor(e.score),
              length: Math.floor(e.length) || 0,
              combo: Math.floor(e.combo) || 0,
              date: e.date || Date.now(),
            }))
        : [],
      settings,
    };
  } catch {
    return base; // storage unavailable or corrupted → fresh defaults
  }
}

export function savePersist(data: PersistData): void {
  try {
    window.localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
  } catch {
    /* storage unavailable — play session continues in-memory */
  }
}

export function saveSettings(settings: Settings): void {
  const data = loadPersist();
  data.settings = settings;
  savePersist(data);
}

/** Record a finished run. Returns final stats with newBest flag + rank. */
export function recordResult(score: number, length: number, maxCombo: number, level: number): RunResult {
  const data = loadPersist();
  const prevBest = data.best;
  const newBest = score > prevBest;
  if (newBest) data.best = score;
  data.bestLength = Math.max(data.bestLength, length);
  data.bestCombo = Math.max(data.bestCombo, maxCombo);

  let rank: number | null = null;
  if (score > 0) {
    const entry: LeaderboardEntry = { score, length, combo: maxCombo, date: Date.now() };
    const board = [...data.board, entry].sort((a, b) => b.score - a.score).slice(0, 5);
    data.board = board;
    const idx = board.indexOf(entry);
    rank = idx >= 0 ? idx + 1 : null;
  }
  savePersist(data);
  return {
    score,
    best: data.best,
    length,
    maxCombo,
    level,
    newBest: newBest && score > 0,
    rank,
  };
}

export function clearAllData(): void {
  try {
    window.localStorage.removeItem(CONFIG.storageKey);
  } catch {
    /* ignore */
  }
}
