// ---------------------------------------------------------------------------
// FoodManager — energy orbs, rare specials and power-up carriers.
// Specials spawn probabilistically per simulation step (frame-rate independent).
// ---------------------------------------------------------------------------

import { CONFIG } from "./config";
import type { FoodItem, FoodKind, PowerKind, Vec } from "./types";
import { choose, manhattan, randInt } from "./utils";
import type { Snake } from "./snake";

const POWER_KINDS: PowerKind[] = ["overdrive", "slowmo", "shield", "dbl"];
const KEY_STRIDE = 1024;

export class FoodManager {
  items: FoodItem[] = [];
  private nextId = 1;

  reset(): void {
    this.items = [];
    this.nextId = 1;
  }

  at(x: number, y: number): FoodItem | undefined {
    return this.items.find((f) => f.x === x && f.y === y);
  }

  remove(id: number): void {
    const i = this.items.findIndex((f) => f.id === id);
    if (i >= 0) this.items.splice(i, 1);
  }

  hasKind(kind: FoodKind): boolean {
    return this.items.some((f) => f.kind === kind);
  }

  private freeCell(snake: Snake, cols: number, rows: number): Vec | null {
    if (snake.segs.length === 0) return null; // engine not initialized yet
    const occ = snake.occupancy(KEY_STRIDE);
    for (const f of this.items) occ.add(f.x + f.y * KEY_STRIDE);
    const head = snake.head;

    for (let tries = 0; tries < CONFIG.food.maxSpawnTries; tries++) {
      const x = randInt(0, cols - 1);
      const y = randInt(0, rows - 1);
      if (occ.has(x + y * KEY_STRIDE)) continue;
      if (manhattan({ x, y }, head) < CONFIG.food.minHeadDistance) continue;
      return { x, y };
    }
    // dense-board fallback: linear scan for anything free
    const opts: Vec[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!occ.has(x + y * KEY_STRIDE)) opts.push({ x, y });
      }
    }
    return opts.length > 0 ? choose(opts) : null;
  }

  spawn(snake: Snake, cols: number, rows: number, kind: FoodKind, now: number, power?: PowerKind, ttl?: number): FoodItem | null {
    const cell = this.freeCell(snake, cols, rows);
    if (!cell) return null;
    const item: FoodItem = {
      id: this.nextId++,
      x: cell.x,
      y: cell.y,
      kind,
      power,
      spawnAt: now,
      ttl,
    };
    this.items.push(item);
    return item;
  }

  /** Guarantee exactly one normal orb exists. */
  ensureNormal(snake: Snake, cols: number, rows: number, now: number): void {
    if (!this.hasKind("normal")) {
      this.spawn(snake, cols, rows, "normal", now);
    }
  }

  /** Per-step special spawn rolls + expiry. Returns expired items (for effects). */
  stepUpdate(snake: Snake, cols: number, rows: number, score: number, now: number): FoodItem[] {
    const expired: FoodItem[] = [];
    for (let i = this.items.length - 1; i >= 0; i--) {
      const f = this.items[i]!;
      if (f.ttl !== undefined && now - f.spawnAt >= f.ttl) {
        expired.push(f);
        this.items.splice(i, 1);
      }
    }

    const specials = this.items.filter((f) => f.kind !== "normal").length;
    if (specials < 2) {
      if (score >= CONFIG.food.goldMinScore && !this.hasKind("gold") && Math.random() < CONFIG.food.goldChancePerStep) {
        this.spawn(snake, cols, rows, "gold", now, undefined, CONFIG.food.goldTtlSec);
      }
      if (score >= CONFIG.food.purpleMinScore && !this.hasKind("purple") && Math.random() < CONFIG.food.purpleChancePerStep) {
        this.spawn(snake, cols, rows, "purple", now, undefined, CONFIG.food.purpleTtlSec);
      }
      if (score >= CONFIG.food.powerMinScore && !this.hasKind("energy") && Math.random() < CONFIG.food.powerChancePerStep) {
        this.spawn(snake, cols, rows, "energy", now, choose(POWER_KINDS), CONFIG.food.powerTtlSec);
      }
    }
    return expired;
  }

  clampToBounds(cols: number, rows: number): void {
    for (const f of this.items) {
      f.x = Math.min(Math.max(f.x, 0), cols - 1);
      f.y = Math.min(Math.max(f.y, 0), rows - 1);
    }
  }
}
