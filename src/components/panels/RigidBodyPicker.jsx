import useSimulationStore from '../../store/simulationStore'

const BODIES = [
  { type: 'block',    icon: 'square',           label: 'Block',   color: 'text-primary',   desc: '60×60 px • ρ=1' },
  { type: 'sphere',   icon: 'circle',           label: 'Sphere',  color: 'text-secondary', desc: 'r=30 px • ρ=1'  },
  { type: 'pentagon', icon: 'pentagon',         label: 'Poly',    color: 'text-tertiary',  desc: '5-sided • ρ=1'  },
  { type: 'wedge',    icon: 'change_history',   label: 'Wedge',   color: 'text-error',     desc: 'Right Triangle' },
  { type: 'block',    icon: 'crop_square',      label: 'Heavy',   color: 'text-primary',   desc: '60×60 px • ρ=4' },
]

export default function RigidBodyPicker() {
  const { spawnBody, runState } = useSimulationStore()

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('body-type', type)
    e.dataTransfer.effectAllowed = 'copy'
    // Ghost image
    const ghost = document.createElement('div')
    ghost.textContent = type
    ghost.className = 'bg-primary/20 text-primary text-xs px-2 py-1 rounded font-mono'
    ghost.style.position = 'absolute'
    ghost.style.top = '-9999px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 20, 10)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  /* Click → spawn at canvas center */
  const handleClick = (type) => {
    spawnBody(type, window.innerWidth * 0.55, window.innerHeight * 0.4)
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {BODIES.map(({ type, icon, label, color, desc }, i) => (
        <div
          key={`${type}-${i}`}
          draggable
          onDragStart={(e) => handleDragStart(e, type)}
          onClick={() => handleClick(type)}
          title={`Drag to canvas or click to spawn • ${desc}`}
          className={`
            group relative p-2.5 bg-surface-container-lowest border border-outline-variant/15
            rounded-lg flex flex-col items-center gap-1.5
            cursor-grab active:cursor-grabbing hover:border-primary/30
            hover:bg-surface-container transition-all duration-150
            active:scale-95 select-none
          `}
        >
          <span className={`material-symbols-outlined text-lg ${color} group-hover:scale-110 transition-transform`}>
            {icon}
          </span>
          <span className="text-[10px] font-label text-zinc-300 font-semibold uppercase tracking-wider">
            {label}
          </span>
          {/* Hover desc */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest border border-outline-variant/20 px-2 py-1 rounded text-[9px] font-label text-on-surface-variant whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {desc}
          </div>
        </div>
      ))}
    </div>
  )
}
