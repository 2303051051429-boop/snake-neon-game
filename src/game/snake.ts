// ---------------------------------------------------------------------------
// Snake — pure grid logic. Rendering interpolation lives here too:
// we keep the previous-step grid copy so the renderer can lerp per index.
// ---------------------------------------------------------------------------

import { CONFIG } from "./config";
import type { Vec } from "./types";
import { lerp } from "./utils";

export class Snake {
  /** Current logical cells, head first. */
  segs: Vec[] = [];
  /** Cells as of the previous simulation step (for smooth interpolation). */
  prev: Vec[] = [];
  pendingGrowth = 0;

  reset(cols: number, rows: number): void {
    const cy = Math.floor(rows / 2);
    const cx = Math.floor(cols / 2) - 2;
    this.segs = [];
    for (let i = 0; i < CONFIG.snake.startLength; i++) {
      this.segs.push({ x: cx - i, y: cy });
    }
    this.prev = this.segs.map((s) => ({ ...s }));
    this.pendingGrowth = 0;
  }

  get head(): Vec {
    return this.segs[0]!;
  }

  get length(): number {
    return this.segs.length;
  }

  grow(n: number): void {
    this.pendingGrowth += n;
  }

  hitsWall(x: number, y: number, cols: number, rows: number): boolean {
    return x < 0 || y < 0 || x >= cols || y >= rows;
  }

  /** True when (x,y) overlaps the body. The tail cell is free when not growing. */
  hitsSelf(x: number, y: number): boolean {
    const growing = this.pendingGrowth > 0;
    const len = growing ? this.segs.length : this.segs.length - 1;
    for (let i = 0; i < len; i++) {
      const s = this.segs[i]!;
      if (s.x === x && s.y === y) return true;
    }
    return false;
  }

  /** Would the next step in direction (dx,dy) be lethal? (autopilot + shield) */
  wouldDie(x: number, y: number, cols: number, rows: number): boolean {
    return this.hitsWall(x, y, cols, rows) || this.hitsSelf(x, y);
  }

  /** Advance one logical step. Called only after collision checks pass. */
  applyStep(nx: number, ny: number): void {
    // copy current → prev (index-aligned, growth-safe capacity)
    this.prev = this.segs.map((s) => ({ ...s }));
    this.segs.unshift({ x: nx, y: ny });
    if (this.pendingGrowth > 0) {
      this.pendingGrowth--;
    } else {
      this.segs.pop();
    }
  }

  /** Set of occupied cell keys (x + y*keyStride) for spawn-safety checks. */
  occupancy(keyStride: number): Set<number> {
    const set = new Set<number>();
    for (const s of this.segs) set.add(s.x + s.y * keyStride);
    return set;
  }

  /** Interpolated cell-space points (head first) for rendering. */
  renderPoints(alpha: number, out: Vec[]): Vec[] {
    out.length = 0;
    const n = this.segs.length;
    const prevLen = this.prev.length;
    for (let i = 0; i < n; i++) {
      const cur = this.segs[i]!;
      const old = this.prev[Math.min(i, prevLen - 1)]!;
      out.push({
        x: lerp(old.x, cur.x, alpha),
        y: lerp(old.y, cur.y, alpha),
      });
    }
    return out;
  }

  /** Clamp every cell into new bounds after a resize. */
  clampToBounds(cols: number, rows: number): void {
    for (const arr of [this.segs, this.prev]) {
      for (const s of arr) {
        s.x = Math.min(Math.max(s.x, 0), cols - 1);
        s.y = Math.min(Math.max(s.y, 0), rows - 1);
      }
    }
  }
}
