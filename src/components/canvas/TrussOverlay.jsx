/**
 * TrussOverlay — decorative SVG bridge truss with stress vectors.
 * Positioned top-right of the canvas, purely visual (matches Stitch mockup).
 */
export default function TrussOverlay() {
  return (
    <div className="absolute top-[12%] right-[12%] w-[380px] h-[190px] pointer-events-none select-none">

      {/* Stress peak label */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-surface-container border border-tertiary/20 rounded px-2 py-0.5 text-[10px] font-headline text-tertiary uppercase tracking-tight whitespace-nowrap">
        Stress Peak: 44.2 kN
      </div>

      <svg
        viewBox="0 0 400 200"
        className="w-full h-full drop-shadow-2xl"
      >
        {/* Defs */}
        <defs>
          <marker id="arrow-stress" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ffd5cb" />
          </marker>
          <marker id="arrow-primary" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#2ff5ff" />
          </marker>
          <filter id="truss-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base chord */}
        <line x1="0" y1="180" x2="400" y2="180"
          stroke="#3c494e" strokeWidth="3.5" />

        {/* Top chord (dashed) */}
        <path d="M 0 180 L 100 22 L 200 180 L 300 22 L 400 180"
          fill="none" stroke="#3c494e" strokeWidth="3.5" strokeDasharray="5 3" />

        {/* Verticals */}
        <line x1="100" y1="22" x2="100" y2="180" stroke="#3c494e" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.5" />
        <line x1="300" y1="22" x2="300" y2="180" stroke="#3c494e" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.5" />
        <line x1="200" y1="22" x2="200" y2="180" stroke="#3c494e" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.3" />

        {/* Support triangles at base */}
        <polygon points="0,180 -10,198 10,198" fill="#3c494e" opacity="0.7" />
        <polygon points="400,180 390,198 410,198" fill="#3c494e" opacity="0.7" />

        {/* Stress nodes */}
        <circle cx="100" cy="22" r="7" fill="#ffd5cb" opacity="0.9" filter="url(#truss-glow)" className="animate-pulse" />
        <circle cx="300" cy="22" r="7" fill="#ffd5cb" opacity="0.9" filter="url(#truss-glow)" className="animate-pulse" />
        <circle cx="200" cy="22" r="5" fill="#2ff5ff" opacity="0.5" />
        <circle cx="0"   cy="180" r="5" fill="#3c494e" />
        <circle cx="400" cy="180" r="5" fill="#3c494e" />

        {/* Stress vectors */}
        <line x1="100" y1="22" x2="100" y2="85"
          stroke="#ffd5cb" strokeWidth="2" markerEnd="url(#arrow-stress)" />
        <line x1="300" y1="22" x2="300" y2="100"
          stroke="#ffd5cb" strokeWidth="2" markerEnd="url(#arrow-stress)" />

        {/* Reaction forces at base */}
        <line x1="0" y1="170" x2="0" y2="130"
          stroke="#2ff5ff" strokeWidth="1.5" markerEnd="url(#arrow-primary)" strokeOpacity="0.5" />
        <line x1="400" y1="170" x2="400" y2="130"
          stroke="#2ff5ff" strokeWidth="1.5" markerEnd="url(#arrow-primary)" strokeOpacity="0.5" />

        {/* Tension labels */}
        <text x="108" y="58" fill="#ffd5cb" fontSize="9" fontFamily="Space Grotesk" fontWeight="600" opacity="0.8">
          T = 22.1kN
        </text>
        <text x="308" y="72" fill="#ffd5cb" fontSize="9" fontFamily="Space Grotesk" fontWeight="600" opacity="0.8">
          T = 22.1kN
        </text>
      </svg>
    </div>
  )
}
