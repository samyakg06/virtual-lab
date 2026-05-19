import useSimulationStore from '../../store/simulationStore'

const JOINTS = [
  {
    id: 'pulley',
    icon: 'link',
    label: 'Pulley System',
    desc: 'Connect two bodies via a rope',
  },
  {
    id: 'spring',
    icon: 'linear_scale',
    label: 'Spring Tension',
    desc: 'Elastic spring constraint',
  },
  {
    id: 'hinge',
    icon: 'rotate_right',
    label: 'Hinge Joint',
    desc: 'Pivot point constraint',
  },
  {
    id: 'slider',
    icon: 'straighten',
    label: 'Slider Rail',
    desc: 'Linear slide constraint',
  },
]

export default function JointPicker() {
  const { activeTool, setActiveTool } = useSimulationStore()

  return (
    <div className="space-y-2">
      {JOINTS.map(({ id, icon, label, desc }) => {
        const isActive = activeTool?.category === 'joint' && activeTool.type === id
        return (
          <button
            key={id}
            title={desc}
            onClick={() => setActiveTool(isActive ? null : { category: 'joint', type: id })}
            className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-all duration-150
              ${isActive
                ? 'bg-secondary/10 border-secondary/30 ring-1 ring-secondary/20'
                : 'bg-surface-container-low border-outline-variant/15 hover:bg-surface-container-high hover:border-outline-variant/30'
              }`}
          >
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-lg ${isActive ? 'text-secondary' : 'text-zinc-500'}`}>
                {icon}
              </span>
              <div>
                <p className={`text-xs font-label font-semibold ${isActive ? 'text-secondary' : 'text-on-surface'}`}>
                  {label}
                </p>
                <p className="text-[9px] font-label text-zinc-600 uppercase tracking-wider">
                  {desc}
                </p>
              </div>
            </div>
            {isActive && <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />}
          </button>
        )
      })}

      {/* Interaction notice */}
      <p className="text-[9px] font-label text-zinc-700 uppercase tracking-widest text-center pt-1">
        Click to equip, then click bodies
      </p>
    </div>
  )
}
