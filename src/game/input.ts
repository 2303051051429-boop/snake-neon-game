// ---------------------------------------------------------------------------
// InputManager — keyboard (arrows/WASD/space/esc/R) + unified pointer swipes.
// Uses e.code so bindings are layout-independent. Swipes work for touch & mouse.
// ---------------------------------------------------------------------------

import type { Direction } from "./types";

export interface InputHandlers {
  dir: (d: Direction) => void;
  confirm: () => void; // space / enter
  escape: () => void;
  restart: () => void; // R
  any: () => void; // any input — unlocks audio
}

const DIR_KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

const SWIPE_MIN = 24;

export class InputManager {
  private h: InputHandlers;
  private el: HTMLElement | null = null;
  private swipeId: number | null = null;
  private swipeX = 0;
  private swipeY = 0;
  private swipeDone = false;

  constructor(handlers: InputHandlers) {
    this.h = handlers;
  }

  attach(el: HTMLElement): void {
    this.el = el;
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointercancel", this.onPointerUp);
    el.addEventListener("contextmenu", this.onContextMenu);
  }

  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    if (this.el) {
      this.el.removeEventListener("pointerdown", this.onPointerDown);
      this.el.removeEventListener("pointermove", this.onPointerMove);
      this.el.removeEventListener("pointerup", this.onPointerUp);
      this.el.removeEventListener("pointercancel", this.onPointerUp);
      this.el.removeEventListener("contextmenu", this.onContextMenu);
    }
    this.el = null;
  }

  private onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

    this.h.any();

    // Let focused buttons keep native Space/Enter activation (accessibility),
    // while arrows/esc/R still work everywhere.
    const onButton = !!target && target.tagName === "BUTTON";

    const dir = DIR_KEYS[e.code];
    if (dir) {
      e.preventDefault(); // stop page scroll
      this.h.dir(dir);
      return;
    }
    switch (e.code) {
      case "Space":
      case "Enter":
        if (onButton) return; // native click will fire
        e.preventDefault();
        if (!e.repeat) this.h.confirm();
        break;
      case "Escape":
        if (!e.repeat) this.h.escape();
        break;
      case "KeyR":
        if (onButton) return;
        if (!e.repeat) this.h.restart();
        break;
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.h.any();
    if (this.swipeId !== null) return;
    this.swipeId = e.pointerId;
    this.swipeX = e.clientX;
    this.swipeY = e.clientY;
    this.swipeDone = false;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.swipeId || this.swipeDone) return;
    const dx = e.clientX - this.swipeX;
    const dy = e.clientY - this.swipeY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
    this.swipeDone = true;
    this.h.dir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId === this.swipeId) {
      this.swipeId = null;
      this.swipeDone = false;
    }
  };
}
