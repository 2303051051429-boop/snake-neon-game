// ---------------------------------------------------------------------------
// SNAKE NEON — central tuning constants. All gameplay "magic numbers" live here.
// ---------------------------------------------------------------------------

export const CONFIG = {
  grid: {
    targetCellCss: 27, // preferred css-px per cell when computing grid size
    minCols: 20,
    maxCols: 34,
    minRows: 14,
    maxRows: 24,
  },
  snake: {
    startLength: 4,
  },
  speed: {
    base: 8.5, // cells/sec at score 0 (normal difficulty)
    hardBase: 10,
    perPoint: 0.021, // +cells/sec per score point — smooth, continuous ramp
    max: 20, // hard cap cells/sec (normal)
    hardMax: 24,
    demo: 10, // attract-mode speed
    slowmoFactor: 0.55, // time dilation while slow-mo is active
    overdriveFactor: 1.38, // speed multiplier while overdrive is active
  },
  score: {
    normal: 10,
    gold: 25,
    purple: 50,
    energy: 15,
    hardMultiplier: 1.25,
  },
  growth: {
    normal: 1,
    gold: 2,
    purple: 3,
    energy: 1,
  },
  combo: {
    windowSec: 6, // eat again within this time to keep the combo
    // multiplier by combo count: 1 → x1, 2 → x1.2, 3 → x1.5, 4 → x1.7, 5+ → x2
    tiers: [1, 1.2, 1.5, 1.7, 2],
  },
  food: {
    goldMinScore: 90,
    purpleMinScore: 180,
    powerMinScore: 140,
    goldChancePerStep: 0.011,
    purpleChancePerStep: 0.0085,
    powerChancePerStep: 0.006,
    goldTtlSec: 12,
    purpleTtlSec: 7,
    powerTtlSec: 9,
    minHeadDistance: 4, // manhattan cells from the head when spawning
    maxSpawnTries: 60,
  },
  power: {
    overdrive: { durationSec: 4, scoreMult: 1.5 },
    slowmo: { durationSec: 3 },
    shield: { durationSec: Infinity }, // lasts until it absorbs one hit
    dbl: { durationSec: 5 },
  },
  particles: {
    max: 420,
  },
  colors: {
    boardTop: "#071228",
    boardBottom: "#030614",
    gridLine: "rgba(56, 160, 248, 0.055)",
    gridLineStrong: "rgba(56, 160, 248, 0.09)",
    snakeHead: "#d8ff7a",
    snakeBodyA: "#46ff96",
    snakeBodyB: "#12d9a0",
    snakeGlow: "rgba(61, 255, 146, 0.85)",
    normal: "#3ce8ff",
    gold: "#ffd166",
    purple: "#c07bff",
    energy: "#ff5ce8",
    overdrive: "#ff9d2e",
    slowmo: "#41c9ff",
    shield: "#3dffce",
    dbl: "#ff4de3",
    death: "#ff4d6a",
  },
  shake: {
    eat: 0.1,
    gold: 0.2,
    purple: 0.28,
    power: 0.18,
    level: 0.3,
    shield: 0.42,
    death: 0.65,
    maxOffset: 15, // css px at trauma = 1
    decay: 1.7, // trauma per second
  },
  ready: {
    countSeconds: 0.72, // per count
    counts: 3,
  },
  storageKey: "snake-neon-v1",
} as const;

export function comboMultiplier(count: number): number {
  if (count <= 0) return 1;
  const idx = Math.min(count - 1, CONFIG.combo.tiers.length - 1);
  return CONFIG.combo.tiers[idx] ?? 1;
}
