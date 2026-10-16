// Virtual D-pad for touch devices. Large targets, instant response.

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import type { Direction } from "@/game/types";
import { cn } from "@/utils/cn";

const BTN =
  "pointer-events-auto flex items-center justify-center rounded-2xl border border-neon-cyan/25 " +
  "bg-[linear-gradient(160deg,rgba(20,32,66,0.6),rgba(8,12,28,0.7))] text-neon-cyan/90 " +
  "shadow-[0_0_18px_-8px_rgba(60,232,255,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] " +
  "transition-transform duration-100 active:scale-90 active:border-neon-cyan/70 active:text-white " +
  "size-[54px] sm:size-[58px]";

export function Dpad({ onDir, className }: { onDir: (d: Direction) => void; className?: string }) {
  const press = (d: Direction) => (e: React.PointerEvent) => {
    e.preventDefault();
    onDir(d);
  };
  return (
    <div
      className={cn("pointer-events-none grid select-none grid-cols-3 gap-2", className)}
      aria-label="Directional pad"
    >
      <span />
      <button type="button" aria-label="Move up" className={BTN} onPointerDown={press("up")}>
        <ArrowUp size={24} />
      </button>
      <span />
      <button type="button" aria-label="Move left" className={BTN} onPointerDown={press("left")}>
        <ArrowLeft size={24} />
      </button>
      <button type="button" aria-label="Move down" className={BTN} onPointerDown={press("down")}>
        <ArrowDown size={24} />
      </button>
      <button type="button" aria-label="Move right" className={BTN} onPointerDown={press("right")}>
        <ArrowRight size={24} />
      </button>
    </div>
  );
}
