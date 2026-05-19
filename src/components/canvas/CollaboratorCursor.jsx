/**
 * CollaboratorCursor — renders a named cursor for a remote user.
 * The SVG cursor tip is pinned to the exact (left, top) position.
 * The name badge floats to the right of the cursor.
 */
export default function CollaboratorCursor({ name, color, x, y, icon, action }) {
  const colorMap = {
    primary:   { fill: '#000000', bg: 'bg-primary',   text: 'text-on-primary'   },
    secondary: { fill: '#000000', bg: 'bg-secondary', text: 'text-on-secondary' },
    tertiary:  { fill: '#000000', bg: 'bg-tertiary',  text: 'text-on-tertiary'  },
  }
  const c = colorMap[color] ?? colorMap.primary

  /* Normalize x/y — accept either "30%" strings or 0–1 floats */
  const left = typeof x === 'number' ? `${(x * 100).toFixed(1)}%` : x
  const top  = typeof y === 'number' ? `${(y * 100).toFixed(1)}%` : y

  return (
    <div
      className="collab-cursor z-20"
      style={{ left, top }}
    >
      {/* SVG cursor — tip of the arrow is at (0,0) which matches the position */}
      <svg
        width="16"
        height="22"
        viewBox="0 0 16 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block"
        style={{ filter: 'drop-shadow(1px 2px 0px rgba(0,0,0,0.3))' }}
      >
        {/* Arrow shape — tip at top-left (0,0) */}
        <path
          d="M0 0L14.5 11L8 11.5L12 21L9 22L5 13L0 17V0Z"
          fill={c.fill}
          stroke="#fff"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name badge — offset to the right of the cursor */}
      <div
        className={`${c.bg} ${c.text} px-2 py-0.5 text-[9px] font-bold font-headline uppercase tracking-wider shadow-brutal-sm border-2 border-black whitespace-nowrap`}
        style={{ position: 'absolute', left: '14px', top: '14px' }}
      >
        {name}
      </div>
    </div>
  )
}
