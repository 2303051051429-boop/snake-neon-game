// ---------------------------------------------------------------------------
// ParticleSystem — fixed-capacity pool, swap-remove, additive glow rendering.
// ---------------------------------------------------------------------------

import { CONFIG } from "./config";
import { rand } from "./utils";

const TAU = Math.PI * 2;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  drag: number;
  grav: number;
  color: string;
  square: boolean;
}

export interface BurstOpts {
  count: number;
  color: string | string[];
  speed?: number;
  speedVar?: number;
  size?: number;
  sizeVar?: number;
  life?: number;
  lifeVar?: number;
  drag?: number;
  grav?: number;
  spread?: number; // radians, default full circle
  dir?: number; // center angle when spread < TAU
  square?: boolean;
}

export class ParticleSystem {
  private arr: Particle[] = [];

  get count(): number {
    return this.arr.length;
  }

  clear(): void {
    this.arr.length = 0;
  }

  private push(p: Particle): void {
    if (this.arr.length >= CONFIG.particles.max) return;
    this.arr.push(p);
  }

  burst(x: number, y: number, o: BurstOpts): void {
    const spread = o.spread ?? TAU;
    const dir = o.dir ?? 0;
    for (let i = 0; i < o.count; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const sp = (o.speed ?? 120) + rand(-1, 1) * (o.speedVar ?? 60);
      const ttl = (o.life ?? 0.55) + rand(-1, 1) * (o.lifeVar ?? 0.2);
      const color = Array.isArray(o.color) ? o.color[Math.floor(Math.random() * o.color.length)]! : o.color;
      this.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: ttl,
        ttl,
        size: Math.max(0.5, (o.size ?? 3) + rand(-1, 1) * (o.sizeVar ?? 1.4)),
        drag: o.drag ?? 2.4,
        grav: o.grav ?? 0,
        color,
        square: o.square ?? false,
      });
    }
  }

  /** Convenience: food pickup burst. */
  eatBurst(x: number, y: number, color: string, big = false): void {
    this.burst(x, y, {
      count: big ? 22 : 12,
      color: [color, "#ffffff"],
      speed: big ? 190 : 130,
      speedVar: 90,
      size: big ? 3.6 : 2.8,
      life: big ? 0.7 : 0.5,
      drag: 3,
    });
  }

  update(dt: number): void {
    const arr = this.arr;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        arr[i] = arr[arr.length - 1]!;
        arr.pop();
        continue;
      }
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const arr = this.arr;
    if (arr.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i]!;
      const t = p.life / p.ttl;
      const alpha = t * t;
      const s = p.size * (0.4 + 0.6 * t);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.square) {
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
