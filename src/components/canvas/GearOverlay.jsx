/**
 * GearOverlay — spinning motor + counter-rotating secondary gear with torque label.
 * Positioned bottom-left of the canvas (matches Stitch mockup).
 */
export default function GearOverlay() {
  return (
    <div className="absolute bottom-[22%] left-[6%] flex items-center gap-5 pointer-events-none select-none">

      {/* ── Primary motor ── */}
      <div className="relative w-24 h-24 rounded-full border-[3px] border-primary/20 flex items-center justify-center glow-primary">

        {/* Outer ring spin */}
        <div
          className="w-20 h-20 rounded-full border border-primary/30 flex items-center justify-center"
          style={{ animation: 'spin 3s linear infinite' }}
        >
          <span
            className="material-symbols-outlined text-primary text-4xl"
            style={{ fontVariationSettings: "'FILL' 0.2" }}
          >
            settings
          </span>
        </div>

        {/* Torque label — right side */}
        <div className="absolute -right-20 top-1 flex flex-col gap-0.5">
          <span className="text-[10px] font-label text-primary font-bold tracking-tight">
            τ = 12.4 Nm
          </span>
          <div className="w-16 h-px bg-primary/30" />
          <span className="text-[9px] font-label text-primary/50 uppercase">
            3 r/s
          </span>
        </div>
      </div>

      {/* ── Secondary gear (counter-rotate) ── */}
      <div
        className="w-16 h-16 rounded-full border-2 border-outline-variant/30 flex items-center justify-center"
        style={{ animation: 'spin 2s linear infinite reverse' }}
      >
        <span className="material-symbols-outlined text-outline-variant text-3xl">
          settings
        </span>
      </div>

      {/* ── Tertiary small gear ── */}
      <div
        className="w-8 h-8 rounded-full border border-outline-variant/20 flex items-center justify-center"
        style={{ animation: 'spin 1s linear infinite' }}
      >
        <span className="material-symbols-outlined text-outline-variant/40 text-base">
          settings
        </span>
      </div>

      {/* Motor label */}
      <div className="absolute -bottom-5 left-0 text-[9px] font-label text-outline uppercase tracking-widest">
        Motor #01 — Running
      </div>
    </div>
  )
}
