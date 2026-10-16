// ---------------------------------------------------------------------------
// BoardRenderer — all canvas drawing. One canvas, DPR-aware, shake-friendly.
// ---------------------------------------------------------------------------

import { CONFIG } from "./config";
import { ParticleSystem } from "./particles";
import type { Direction, FoodKind, Popup, PowerKind, Vec } from "./types";
import { clamp, DIR_VEC, hexA, mixHex } from "./utils";

const TAU = Math.PI * 2;
const C = CONFIG.colors;

export interface RenderFood {
  cx: number; // cell coords (float allowed)
  cy: number;
  phase: number;
  pulse: number; // 0..1 time-based value computed by engine
  expireFrac: number; // -1 = persistent, otherwise remaining fraction 0..1
  kind: FoodKind;
  power?: PowerKind;
}

export interface TrailDot {
  x: number;
  y: number;
  life: number;
}

export interface RenderState {
  time: number;
  demo: boolean;
  snakePts: Vec[]; // cell-space interpolated points (head first)
  headDir: Direction;
  snakeAlpha: number;
  deathFlash: number;
  eatPulse: number; // 1 → 0 after each eat
  flash: number; // level-up board flash 1 → 0
  borderPulse: number;
  foods: RenderFood[];
  popups: Popup[]; // cell-space
  trail: TrailDot[]; // cell-space
  particles: ParticleSystem;
  tint: string | null; // rgba edge tint while a power runs
}

export class BoardRenderer {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private w = 0;
  private h = 0;
  cell = 20;
  ox = 0;
  oy = 0;
  cols = 30;
  rows = 20;

  constructor(canvas: HTMLCanvasElement) {
    this.cv = canvas;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
  }

  resize(cssW: number, cssH: number, cols: number, rows: number): void {
    this.dpr = clamp(window.devicePixelRatio || 1, 1, 2.5);
    this.w = Math.max(1, cssW);
    this.h = Math.max(1, cssH);
    this.cv.width = Math.round(this.w * this.dpr);
    this.cv.height = Math.round(this.h * this.dpr);
    this.cols = cols;
    this.rows = rows;
    const pad = Math.min(14, this.w * 0.02);
    this.cell = Math.max(8, Math.floor(Math.min((this.w - pad * 2) / cols, (this.h - pad * 2) / rows)));
    this.ox = Math.round((this.w - this.cell * cols) / 2);
    this.oy = Math.round((this.h - this.cell * rows) / 2);
  }

  cellX(cx: number): number {
    return this.ox + (cx + 0.5) * this.cell;
  }
  cellY(cy: number): number {
    return this.oy + (cy + 0.5) * this.cell;
  }

  get boardW(): number {
    return this.cell * this.cols;
  }
  get boardH(): number {
    return this.cell * this.rows;
  }

  private rr(x: number, y: number, w: number, h: number, r: number): void {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  draw(rs: RenderState, shakeX: number, shakeY: number): void {
    const c = this.ctx;
    const t = rs.time;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    c.setTransform(this.dpr, 0, 0, this.dpr, shakeX * this.dpr, shakeY * this.dpr);

    const { ox, oy, boardW: bw, boardH: bh } = this;
    const radius = Math.min(22, this.cell * 0.9);

    // --- board base ---
    const bg = c.createLinearGradient(0, oy, 0, oy + bh);
    bg.addColorStop(0, C.boardTop);
    bg.addColorStop(1, C.boardBottom);
    this.rr(ox, oy, bw, bh, radius);
    c.fillStyle = bg;
    c.fill();

    // inner content (grid + dust) clipped to board
    c.save();
    this.rr(ox, oy, bw, bh, radius);
    c.clip();

    c.strokeStyle = C.gridLine;
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 1; i < this.cols; i++) {
      const x = ox + i * this.cell + 0.5;
      c.moveTo(x, oy);
      c.lineTo(x, oy + bh);
    }
    for (let j = 1; j < this.rows; j++) {
      const y = oy + j * this.cell + 0.5;
      c.moveTo(ox, y);
      c.lineTo(ox + bw, y);
    }
    c.stroke();

    // ambient dust drifting inside the board
    c.fillStyle = "rgba(120, 200, 255, 0.5)";
    for (let i = 0; i < 20; i++) {
      const seed = i * 137.51;
      const px = ox + ((seed * 7.3 + t * (6 + (i % 5) * 3.2)) % (bw + 30)) - 15;
      const py = oy + ((seed * 3.1 + t * (3 + (i % 4) * 1.8)) % (bh + 30)) - 15;
      c.globalAlpha = 0.05 + 0.05 * Math.sin(t * 1.4 + i * 2.2);
      c.beginPath();
      c.arc(px, py, 1.1 + (i % 3) * 0.5, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;
    c.restore();

    // --- border glow (layered strokes, cheap shadow-free bloom) ---
    const pulse = 0.55 + 0.45 * Math.sin(t * 1.6);
    for (const [lw, a] of [
      [7, 0.05],
      [3, 0.14],
    ] as const) {
      this.rr(ox, oy, bw, bh, radius);
      c.lineWidth = lw;
      c.strokeStyle = hexA(C.normal, a + rs.flash * 0.25);
      c.stroke();
    }
    const borderGrad = c.createLinearGradient(ox, oy, ox + bw, oy + bh);
    borderGrad.addColorStop(0, hexA(C.normal, 0.55 + 0.3 * pulse + rs.flash * 0.4));
    borderGrad.addColorStop(0.5, hexA(C.purple, 0.5 + 0.3 * (1 - pulse) + rs.flash * 0.4));
    borderGrad.addColorStop(1, hexA(C.snakeBodyA, 0.55 + 0.3 * pulse + rs.flash * 0.4));
    this.rr(ox, oy, bw, bh, radius);
    c.lineWidth = 1.4;
    c.strokeStyle = borderGrad;
    c.stroke();

    // travelling corner spark
    const per = (t * 0.14) % 1;
    const segLen = 2 * (bw + bh);
    const d = per * segLen;
    let sx = ox;
    let sy = oy;
    if (d < bw) { sx = ox + d; sy = oy; }
    else if (d < bw + bh) { sx = ox + bw; sy = oy + (d - bw); }
    else if (d < 2 * bw + bh) { sx = ox + bw - (d - bw - bh); sy = oy + bh; }
    else { sx = ox; sy = oy + bh - (d - 2 * bw - bh); }
    const spark = c.createRadialGradient(sx, sy, 0, sx, sy, 26);
    spark.addColorStop(0, "rgba(160, 240, 255, 0.5)");
    spark.addColorStop(1, "rgba(160, 240, 255, 0)");
    c.fillStyle = spark;
    c.beginPath();
    c.arc(sx, sy, 26, 0, TAU);
    c.fill();

    // --- foods ---
    for (const f of rs.foods) this.drawFood(f, t);

    // --- snake trail ---
    if (rs.trail.length > 0) {
      c.save();
      c.globalCompositeOperation = "lighter";
      for (const d0t of rs.trail) {
        const a = d0t.life * 0.18;
        if (a <= 0.004) continue;
        c.globalAlpha = a;
        c.fillStyle = C.snakeGlow;
        c.beginPath();
        c.arc(this.cellX(d0t.x), this.cellY(d0t.y), this.cell * 0.2 * d0t.life + 0.5, 0, TAU);
        c.fill();
      }
      c.restore();
    }

    // --- snake ---
    if (rs.snakePts.length > 0 && rs.snakeAlpha > 0.01) this.drawSnake(rs);

    // --- particles ---
    rs.particles.draw(c);

    // --- popups ---
    for (const p of rs.popups) this.drawPopup(p);

    // --- level flash ---
    if (rs.flash > 0.01) {
      c.save();
      this.rr(ox, oy, bw, bh, radius);
      c.clip();
      c.fillStyle = `rgba(190, 255, 235, ${rs.flash * 0.14})`;
      c.fillRect(ox, oy, bw, bh);
      c.restore();
    }

    // --- active-power edge tint ---
    if (rs.tint) {
      c.save();
      this.rr(ox, oy, bw, bh, radius);
      c.clip();
      const vg = c.createRadialGradient(
        ox + bw / 2, oy + bh / 2, Math.min(bw, bh) * 0.36,
        ox + bw / 2, oy + bh / 2, Math.max(bw, bh) * 0.72,
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, rs.tint);
      c.fillStyle = vg;
      c.fillRect(ox, oy, bw, bh);
      c.restore();
    }

    // --- demo watermark ---
    if (rs.demo) {
      c.save();
      c.font = `600 ${Math.max(10, this.cell * 0.42)}px "Chakra Petch", sans-serif`;
      c.textAlign = "right";
      c.fillStyle = "rgba(140, 190, 255, 0.32)";
      c.fillText("ATTRACT MODE — SPECTATING", ox + bw - 10, oy + bh - 10);
      c.restore();
    }
  }

  private drawFood(f: RenderFood, t: number): void {
    const c = this.ctx;
    const x = this.cellX(f.cx);
    const y = this.cellY(f.cy);
    const baseCol =
      f.kind === "normal" ? C.normal
      : f.kind === "gold" ? C.gold
      : f.kind === "purple" ? C.purple
      : f.kind === "energy" ? (f.power ? C[f.power] : C.energy)
      : C.normal;

    let alpha = 1;
    if (f.expireFrac >= 0 && f.expireFrac < 0.25) {
      alpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 10));
    }

    const pulse = 1 + 0.13 * Math.sin(t * 3.1 + f.phase);
    const r = this.cell * 0.3 * pulse * (f.kind === "normal" ? 0.9 : 1.12);

    c.save();
    c.globalAlpha = alpha;

    // halo
    const halo = c.createRadialGradient(x, y, 0, x, y, r * 3.4);
    halo.addColorStop(0, hexA(baseCol, 0.5));
    halo.addColorStop(1, hexA(baseCol, 0));
    c.fillStyle = halo;
    c.beginPath();
    c.arc(x, y, r * 3.4, 0, TAU);
    c.fill();

    // orbiting sparks
    for (let i = 0; i < 3; i++) {
      const a = t * (1.4 + i * 0.3) + (i * TAU) / 3 + f.phase;
      const rr2 = r * 2;
      c.fillStyle = hexA(baseCol, 0.75);
      c.beginPath();
      c.arc(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2, Math.max(1, this.cell * 0.05), 0, TAU);
      c.fill();
    }

    // special ring
    if (f.kind !== "normal") {
      c.save();
      c.setLineDash([6, 7]);
      c.lineDashOffset = -t * 26;
      c.strokeStyle = hexA(baseCol, 0.7);
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(x, y, r * 1.75, 0, TAU);
      c.stroke();
      c.restore();
    }

    // core + hot center
    c.fillStyle = baseCol;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
    const core = c.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
    core.addColorStop(0, "rgba(255,255,255,0.95)");
    core.addColorStop(0.5, hexA(baseCol, 0.35));
    core.addColorStop(1, hexA(baseCol, 0));
    c.fillStyle = core;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();

    if (f.kind === "energy" && f.power) {
      this.drawPowerIcon(f.power, x, y, r * 1.15, "#ffffff");
    }
    c.restore();
  }

  private drawPowerIcon(kind: PowerKind, x: number, y: number, size: number, color: string): void {
    const c = this.ctx;
    c.save();
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = Math.max(1.4, size * 0.16);
    c.lineCap = "round";
    c.lineJoin = "round";
    const s = size;
    if (kind === "overdrive") {
      c.beginPath();
      c.moveTo(x + s * 0.12, y - s * 0.62);
      c.lineTo(x - s * 0.34, y + s * 0.1);
      c.lineTo(x - s * 0.02, y + s * 0.1);
      c.lineTo(x - s * 0.14, y + s * 0.62);
      c.lineTo(x + s * 0.34, y - s * 0.12);
      c.lineTo(x + s * 0.02, y - s * 0.12);
      c.closePath();
      c.fill();
    } else if (kind === "slowmo") {
      c.beginPath();
      c.arc(x, y, s * 0.55, 0, TAU);
      c.stroke();
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, y - s * 0.34);
      c.moveTo(x, y);
      c.lineTo(x + s * 0.26, y);
      c.stroke();
    } else if (kind === "shield") {
      c.beginPath();
      c.moveTo(x, y - s * 0.6);
      c.lineTo(x + s * 0.5, y - s * 0.34);
      c.lineTo(x + s * 0.5, y + s * 0.08);
      c.quadraticCurveTo(x + s * 0.5, y + s * 0.44, x, y + s * 0.62);
      c.quadraticCurveTo(x - s * 0.5, y + s * 0.44, x - s * 0.5, y + s * 0.08);
      c.lineTo(x - s * 0.5, y - s * 0.34);
      c.closePath();
      c.stroke();
    } else {
      // dbl — "×2"
      c.font = `800 ${Math.max(9, s * 0.9)}px "Orbitron", sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("×2", x, y + s * 0.05);
    }
    c.restore();
  }

  private drawSnake(rs: RenderState): void {
    const c = this.ctx;
    const pts = rs.snakePts;
    const w = this.cell * 0.62;
    const headPx = { x: this.cellX(pts[0]!.x), y: this.cellY(pts[0]!.y) };

    c.save();
    c.globalAlpha = rs.snakeAlpha;
    c.lineCap = "round";
    c.lineJoin = "round";

    const tracePath = (): void => {
      c.beginPath();
      c.moveTo(headPx.x, headPx.y);
      for (let i = 1; i < pts.length; i++) {
        c.lineTo(this.cellX(pts[i]!.x), this.cellY(pts[i]!.y));
      }
    };

    // glow passes (additive)
    c.save();
    c.globalCompositeOperation = "lighter";
    tracePath();
    c.lineWidth = w * 1.9;
    c.strokeStyle = hexA(C.snakeBodyA, 0.1);
    c.stroke();
    tracePath();
    c.lineWidth = w * 1.35;
    c.strokeStyle = hexA(C.snakeBodyA, 0.16);
    c.stroke();
    c.restore();

    // body gradient head → tail
    const tailPx = {
      x: this.cellX(pts[pts.length - 1]!.x),
      y: this.cellY(pts[pts.length - 1]!.y),
    };
    const grad = c.createLinearGradient(headPx.x, headPx.y, tailPx.x, tailPx.y);
    grad.addColorStop(0, C.snakeBodyA);
    grad.addColorStop(0.6, mixHex(C.snakeBodyA, C.snakeBodyB, 0.55, 1));
    grad.addColorStop(1, C.snakeBodyB);
    tracePath();
    c.lineWidth = w;
    c.strokeStyle = grad;
    c.stroke();

    // subtle inner sheen
    tracePath();
    c.lineWidth = w * 0.34;
    c.strokeStyle = "rgba(255,255,255,0.13)";
    c.stroke();

    // eat pulse ring
    if (rs.eatPulse > 0.01) {
      const p = 1 - rs.eatPulse;
      c.save();
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = rs.eatPulse * 0.8;
      c.strokeStyle = C.snakeGlow;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(headPx.x, headPx.y, this.cell * (0.45 + p * 1.7), 0, TAU);
      c.stroke();
      c.restore();
    }

    // head
    const hr = this.cell * 0.47;
    c.save();
    c.shadowColor = C.snakeGlow;
    c.shadowBlur = this.cell * 0.9;
    const hg = c.createRadialGradient(headPx.x - hr * 0.3, headPx.y - hr * 0.3, hr * 0.1, headPx.x, headPx.y, hr);
    hg.addColorStop(0, "#f3ffd0");
    hg.addColorStop(0.45, C.snakeHead);
    hg.addColorStop(1, C.snakeBodyA);
    c.fillStyle = hg;
    c.beginPath();
    c.arc(headPx.x, headPx.y, hr, 0, TAU);
    c.fill();
    c.restore();

    // eyes — two, oriented by head direction
    const dv = DIR_VEC[rs.headDir];
    const perp = { x: -dv.y, y: dv.x };
    for (const side of [-1, 1]) {
      const ex = headPx.x + dv.x * hr * 0.3 + perp.x * side * hr * 0.44;
      const ey = headPx.y + dv.y * hr * 0.3 + perp.y * side * hr * 0.44;
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(ex, ey, hr * 0.26, 0, TAU);
      c.fill();
      c.fillStyle = "#07220f";
      c.beginPath();
      c.arc(ex + dv.x * hr * 0.1, ey + dv.y * hr * 0.1, hr * 0.13, 0, TAU);
      c.fill();
    }

    // death flash flicker
    if (rs.deathFlash > 0.01) {
      tracePath();
      c.lineWidth = w * 1.05;
      c.strokeStyle = `rgba(255,255,255,${rs.deathFlash * 0.85})`;
      c.stroke();
      c.fillStyle = `rgba(255,120,120,${rs.deathFlash * 0.6})`;
      c.beginPath();
      c.arc(headPx.x, headPx.y, hr * 1.1, 0, TAU);
      c.fill();
    }
    c.restore();
  }

  private drawPopup(p: Popup): void {
    const c = this.ctx;
    const prog = 1 - p.life / p.ttl;
    const alpha = clamp(p.life / p.ttl, 0, 1);
    const x = this.cellX(p.x);
    const y = this.cellY(p.y) - this.cell * 0.4 - prog * this.cell * 1.1;
    const scale = prog < 0.14 ? 0.6 + (prog / 0.14) * 0.4 : 1;
    c.save();
    c.globalAlpha = alpha * alpha;
    c.font = `800 ${p.size * scale}px "Orbitron", sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.shadowColor = p.color;
    c.shadowBlur = 12;
    c.fillStyle = p.color;
    c.fillText(p.text, x, y);
    c.shadowBlur = 0;
    c.fillStyle = "rgba(255,255,255,0.85)";
    c.fillText(p.text, x, y);
    c.restore();
  }
}
