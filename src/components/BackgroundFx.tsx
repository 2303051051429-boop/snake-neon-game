// Ambient cyber-neon backdrop: gradients, grid, scanlines, drifting glow orbs.

export function BackgroundFx() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* base radial glows */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 18% -8%, rgba(38,120,255,0.16), transparent 65%)," +
            "radial-gradient(800px 560px at 88% 108%, rgba(140,64,255,0.16), transparent 62%)," +
            "radial-gradient(700px 420px at 50% 55%, rgba(32,255,150,0.05), transparent 60%)",
        }}
      />
      {/* neon grid */}
      <div className="fx-grid absolute inset-0" />
      {/* blurred glow orbs */}
      <div className="orb left-[6%] top-[16%] size-40 bg-cyan-500/25" style={{ animationDelay: "-2s" }} />
      <div className="orb right-[8%] top-[8%] size-52 bg-purple-600/25" style={{ animationDelay: "-5s" }} />
      <div className="orb bottom-[10%] left-[16%] size-44 bg-emerald-500/20" style={{ animationDelay: "-3.4s" }} />
      <div className="orb bottom-[6%] right-[14%] size-36 bg-pink-500/20" style={{ animationDelay: "-7s" }} />
      {/* scanlines + vignette */}
      <div className="fx-scanlines absolute inset-0 opacity-60" />
      <div className="fx-vignette absolute inset-0" />
    </div>
  );
}
