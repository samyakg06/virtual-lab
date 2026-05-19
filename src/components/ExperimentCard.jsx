/* ── Inline SVG thumbnails keyed by experiment id ── */
const THUMBS = {
  pendulum: (
    <svg viewBox="0 0 120 90" className="w-full h-full">
      <line x1="60" y1="5" x2="60" y2="5" stroke="#3c494e" strokeWidth="1" />
      <line x1="60" y1="5" x2="45" y2="55" stroke="#2ff5ff" strokeWidth="1.5" strokeDasharray="3 2" />
      <circle cx="45" cy="58" r="7" fill="rgba(47,245,255,0.15)" stroke="#2ff5ff" strokeWidth="1.5" className="animate-pulse" />
      <line x1="60" y1="5" x2="72" y2="48" stroke="#3c494e" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 2" />
      <circle cx="72" cy="51" r="5" fill="rgba(60,73,78,0.3)" stroke="#3c494e" strokeWidth="1" />
      <line x1="10" y1="5" x2="110" y2="5" stroke="#3c494e" strokeWidth="2" />
      {[15,25,35,45,55,65,75,85,95,105].map(x => (
        <line key={x} x1={x} y1="5" x2={x-2} y2="10" stroke="#3c494e" strokeWidth="1" strokeOpacity="0.5" />
      ))}
      <text x="60" y="82" textAnchor="middle" fill="#3c494e" fontSize="7" fontFamily="Space Grotesk">T = 2π√(L/g)</text>
    </svg>
  ),
  cradle: (
    <svg viewBox="0 0 120 90" className="w-full h-full">
      {[20,33,46,59,72].map((x, i) => (
        <g key={i}>
          <line x1={x} y1="10" x2={x} y2="58" stroke="#3c494e" strokeWidth="1" strokeDasharray="2 1" />
          <circle cx={x} cy="62" r="7" fill="rgba(255,243,210,0.15)" stroke="#fff3d2" strokeWidth="1.2" />
        </g>
      ))}
      <line x1="10" y1="10" x2="85" y2="10" stroke="#3c494e" strokeWidth="1.5" />
      <circle cx="5" cy="62" r="7" fill="rgba(255,243,210,0.3)" stroke="#fff3d2" strokeWidth="1.5" />
      <line x1="5" y1="10" x2="5" y2="58" stroke="#fff3d2" strokeWidth="1" strokeDasharray="2 1" />
      <text x="60" y="82" textAnchor="middle" fill="#3c494e" fontSize="7" fontFamily="Space Grotesk">p = mv (conserved)</text>
    </svg>
  ),
  truss: (
    <svg viewBox="0 0 120 90" className="w-full h-full">
      <path d="M 10 75 L 35 20 L 60 75 L 85 20 L 110 75 Z" fill="none" stroke="#3c494e" strokeWidth="2" strokeDasharray="3 2" />
      <line x1="10" y1="75" x2="110" y2="75" stroke="#3c494e" strokeWidth="2" />
      <circle cx="35" cy="20" r="4" fill="#ffd5cb" className="animate-pulse" />
      <circle cx="85" cy="20" r="4" fill="#ffd5cb" className="animate-pulse" />
      <line x1="35" y1="20" x2="35" y2="45" stroke="#ffd5cb" strokeWidth="1.5" markerEnd="url(#a)" />
      <line x1="85" y1="20" x2="85" y2="50" stroke="#ffd5cb" strokeWidth="1.5" />
      <text x="60" y="85" textAnchor="middle" fill="#3c494e" fontSize="7" fontFamily="Space Grotesk">Stress Peak: 44.2kN</text>
    </svg>
  ),
  pulley: (
    <svg viewBox="0 0 120 90" className="w-full h-full">
      {/* Support bar */}
      <line x1="30" y1="8" x2="90" y2="8" stroke="#3c494e" strokeWidth="2" />
      {[35,45,55,65,75,85].map(x => (
        <line key={x} x1={x} y1="8" x2={x-2} y2="13" stroke="#3c494e" strokeWidth="1" strokeOpacity="0.5" />
      ))}
      {/* Pulley wheel */}
      <circle cx="60" cy="20" r="10" fill="none" stroke="#2ff5ff" strokeWidth="2" />
      <circle cx="60" cy="20" r="2" fill="#2ff5ff" />
      {/* Left rope */}
      <line x1="50" y1="20" x2="50" y2="58" stroke="#d4d4d8" strokeWidth="1.5" />
      {/* Right rope */}
      <line x1="70" y1="20" x2="70" y2="68" stroke="#d4d4d8" strokeWidth="1.5" />
      {/* Rope over pulley (arc) */}
      <path d="M 50 20 A 10 10 0 0 1 70 20" fill="none" stroke="#d4d4d8" strokeWidth="1.5" />
      {/* Mass A (lighter, higher) */}
      <rect x="39" y="58" width="22" height="14" rx="2" fill="rgba(47,245,255,0.12)" stroke="#2ff5ff" strokeWidth="1.5" />
      <text x="50" y="68" textAnchor="middle" fill="#2ff5ff" fontSize="7" fontFamily="Space Grotesk">m₁</text>
      {/* Mass B (heavier, lower) */}
      <rect x="57" y="68" width="26" height="16" rx="2" fill="rgba(255,243,210,0.15)" stroke="#fff3d2" strokeWidth="1.5" />
      <text x="70" y="79" textAnchor="middle" fill="#fff3d2" fontSize="7" fontFamily="Space Grotesk">m₂</text>
      {/* Acceleration arrows */}
      <line x1="38" y1="68" x2="38" y2="58" stroke="#fbbf24" strokeWidth="1.2" />
      <polygon points="38,56 36,60 40,60" fill="#fbbf24" />
      <line x1="85" y1="72" x2="85" y2="82" stroke="#fbbf24" strokeWidth="1.2" />
      <polygon points="85,84 83,80 87,80" fill="#fbbf24" />
      {/* Formula */}
      <text x="60" y="88" textAnchor="middle" fill="#3c494e" fontSize="6.5" fontFamily="Space Grotesk">a = g(m₂−m₁)/(m₁+m₂)</text>
    </svg>
  ),
  projectile: (
    <svg viewBox="0 0 120 90" className="w-full h-full">
      <path d="M 10 75 Q 55 10 110 65" fill="none" stroke="#2ff5ff" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.6" />
      {[10,30,55,80,105].map((x, i) => {
        const ys = [75, 38, 16, 38, 65]
        return <circle key={i} cx={x} cy={ys[i]} r="4" fill={`rgba(47,245,255,${0.3 + i*0.1})`} stroke="#2ff5ff" strokeWidth="1" />
      })}
      <line x1="10" y1="75" x2="110" y2="75" stroke="#3c494e" strokeWidth="1.5" />
      <line x1="10" y1="10" x2="10" y2="75" stroke="#3c494e" strokeWidth="1.5" />
      <text x="60" y="85" textAnchor="middle" fill="#3c494e" fontSize="7" fontFamily="Space Grotesk">x = v₀cosθ · t</text>
    </svg>
  ),
  spring: (
    <svg viewBox="0 0 120 90" className="w-full h-full">
      <line x1="60" y1="5" x2="60" y2="15" stroke="#2ff5ff" strokeWidth="2" />
      {[0,1,2,3,4,5,6].map(i => (
        <line key={i} x1={i%2===0?48:72} y1={15+i*7} x2={i%2===0?72:48} y2={15+(i+1)*7} stroke="#fff3d2" strokeWidth="1.5" />
      ))}
      <rect x="40" y="64" width="40" height="20" rx="2" fill="rgba(47,245,255,0.12)" stroke="#2ff5ff" strokeWidth="1.5" />
      <line x1="10" y1="5" x2="110" y2="5" stroke="#3c494e" strokeWidth="2" />
      <text x="60" y="88" textAnchor="middle" fill="#3c494e" fontSize="7" fontFamily="Space Grotesk">F = -kx</text>
    </svg>
  ),
  incline: (
    <svg viewBox="0 0 120 90" className="w-full h-full">
      <polygon points="10,80 110,80 110,35" fill="rgba(60,73,78,0.2)" stroke="#3c494e" strokeWidth="1.5" />
      <text x="60" y="87" textAnchor="middle" fill="#3c494e" fontSize="7" fontFamily="Space Grotesk">a = g(sinθ − μcosθ)</text>
    </svg>
  ),
  collision: (
    <svg viewBox="0 0 120 90" className="w-full h-full">
      <circle cx="28" cy="45" r="14" fill="rgba(47,245,255,0.12)" stroke="#2ff5ff" strokeWidth="1.5" />
      <circle cx="75" cy="45" r="14" fill="rgba(255,243,210,0.12)" stroke="#fff3d2" strokeWidth="1.5" />
      <line x1="42" y1="45" x2="58" y2="45" stroke="#ffd5cb" strokeWidth="1" strokeDasharray="2 1" strokeOpacity="0.6" />
      <line x1="9" y1="45" x2="22" y2="45" stroke="#2ff5ff" strokeWidth="1.5" markerEnd="url(#b)" />
      <text x="16" y="40" fill="#2ff5ff" fontSize="7" fontFamily="Space Grotesk">v₁</text>
      <text x="60" y="87" textAnchor="middle" fill="#3c494e" fontSize="7" fontFamily="Space Grotesk">m₁v₁ + m₂v₂ = const</text>
    </svg>
  ),
  domino: (
    <svg viewBox="0 0 120 90" className="w-full h-full">
      {[12,27,42,57,72,87].map((x, i) => (
        <rect
          key={i} x={x} y={i === 0 ? 38 : 48} width="10" height={i === 0 ? 30 : 24}
          rx="1" fill={`rgba(47,245,255,${0.08 + i*0.04})`} stroke="#2ff5ff" strokeWidth="1.2"
          transform={i === 0 ? `rotate(-15,${x+5},${38+15})` : ''}
        />
      ))}
      <line x1="5" y1="76" x2="105" y2="76" stroke="#3c494e" strokeWidth="1.5" />
      <text x="60" y="87" textAnchor="middle" fill="#3c494e" fontSize="7" fontFamily="Space Grotesk">Chain Reaction</text>
    </svg>
  ),
}

const DIFFICULTY_COLORS = {
  Beginner:     { bg: 'bg-primary',   text: 'text-black',   border: 'border-black' },
  Intermediate: { bg: 'bg-secondary', text: 'text-black', border: 'border-black' },
  Advanced:     { bg: 'bg-tertiary',  text: 'text-black',  border: 'border-black' },
}

const AUTHOR_COLORS = {
  primary:   'text-primary',
  secondary: 'text-secondary',
  tertiary:  'text-tertiary',
}

export default function ExperimentCard({ experiment, onLoad }) {
  const diff = DIFFICULTY_COLORS[experiment.difficulty] ?? DIFFICULTY_COLORS.Beginner

  return (
    <div
      onClick={() => onLoad(experiment)}
      className="
        group relative flex flex-col h-full
        rounded-none overflow-hidden
        bg-white border-4 border-black
        hover:-translate-x-1 hover:-translate-y-1 shadow-brutal hover:shadow-[8px_8px_0px_#000]
        transition-all duration-200 cursor-pointer
      "
    >
      {/* ── Background Hover ── */}
      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-5 transition-opacity duration-200 pointer-events-none" />

      {/* ── Thumbnail ── */}
      <div className="h-40 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Subtle grid pattern inside thumbnail */}
        <div className="absolute inset-0 dotted-grid pointer-events-none" />
        
        <div className="relative w-full h-full transform group-hover:scale-105 transition-transform duration-700 ease-out">
          {THUMBS[experiment.svgPreview] ?? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-outline/50 text-4xl">science</span>
            </div>
          )}
        </div>

        {/* Difficulty badge */}
        <div className={`absolute top-4 right-4 px-2 py-1 rounded-none border-2 text-[9px] font-label font-bold uppercase tracking-widest ${diff.bg} ${diff.text} ${diff.border}`}>
          {experiment.difficulty}
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col flex-1 px-6 pb-6 pt-2 relative z-10">
        
        {/* Title + category */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="text-lg font-headline font-semibold text-on-surface group-hover:text-primary transition-colors leading-tight">
              {experiment.title}
            </h3>
          </div>
          <p className="text-xs font-body text-on-surface-variant/70 leading-relaxed line-clamp-2">
            {experiment.description}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {experiment.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md text-[9px] font-label text-zinc-400 uppercase tracking-widest bg-white/5 border border-white/5"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Spacer to push footer to bottom */}
        <div className="mt-auto" />

        {/* Footer (Author + Stats + Load) */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex flex-col gap-1">
            <div className={`flex items-center gap-1.5 text-[10px] font-label font-medium uppercase tracking-widest ${AUTHOR_COLORS[experiment.authorColor]}`}>
              <span className="material-symbols-outlined text-[14px]">psychology</span>
              {experiment.author}
            </div>
            <div className="flex items-center gap-2 text-[9px] font-label text-zinc-500 uppercase tracking-wider">
              <span>{experiment.stats.bodies} bodies</span>
              <span className="w-0.5 h-0.5 rounded-full bg-zinc-600" />
              <span>{experiment.stats.joints} joints</span>
            </div>
          </div>

          <button
            className="
              flex items-center gap-1.5 px-4 py-2 rounded-none border-2 border-black
              bg-white text-black
              group-hover:bg-primary group-hover:text-black
              shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none
              text-[10px] font-headline font-bold uppercase tracking-widest
              transition-all duration-200
            "
          >
            Load
            <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  )
}
