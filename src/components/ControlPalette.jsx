import { useState } from 'react'
import useSimulationStore from '../store/simulationStore'
import ExperimentControls from './panels/ExperimentControls'

/* ────────── Rigid Body Picker Inline Component ────────── */
const BODIES = [
  { type: 'block',    icon: 'square',           label: 'Block',   color: 'text-primary',   desc: '60×60 px • ρ=1' },
  { type: 'sphere',   icon: 'circle',           label: 'Sphere',  color: 'text-secondary', desc: 'r=30 px • ρ=1'  },
  { type: 'pentagon', icon: 'pentagon',         label: 'Poly',    color: 'text-tertiary',  desc: '5-sided • ρ=1'  },
  { type: 'wedge',    icon: 'change_history',   label: 'Wedge',   color: 'text-error',     desc: 'Right Triangle' },
  { type: 'pulleyWheel', icon: 'trip_origin',   label: 'Pulley',  color: 'text-tertiary',  desc: 'Static Wheel'   },
  { type: 'block',    icon: 'crop_square',      label: 'Heavy',   color: 'text-primary',   desc: '60×60 px • ρ=4' },
]

function RigidBodyPicker() {
  const { spawnBody } = useSimulationStore()

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('body-type', type)
    e.dataTransfer.effectAllowed = 'copy'
    const ghost = document.createElement('div')
    ghost.textContent = type
    ghost.className = 'bg-primary/20 text-primary text-xs px-2 py-1 rounded font-mono'
    ghost.style.position = 'absolute'
    ghost.style.top = '-9999px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 20, 10)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

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
          className={`group relative p-2.5 bg-white border-2 border-black rounded-none flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing hover:bg-secondary hover:shadow-button transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none select-none`}
        >
          <span className={`material-symbols-outlined text-lg text-black group-hover:scale-110 transition-transform`}>{icon}</span>
          <span className="text-[10px] font-label text-black font-semibold uppercase tracking-wider">{label}</span>
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black border-2 border-black px-2 py-1 rounded-none text-[9px] font-label text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-brutal-sm">
            {desc}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ────────── Joint Picker Inline Component ────────── */
const JOINTS = [
  { id: 'pulley', icon: 'link',         label: 'Pulley System', desc: 'Connect two bodies via a rope' },
  { id: 'spring', icon: 'linear_scale', label: 'Spring Tension', desc: 'Elastic spring constraint' },
  { id: 'hinge',  icon: 'rotate_right', label: 'Hinge Joint',   desc: 'Pivot point constraint' },
  { id: 'slider', icon: 'straighten',   label: 'Slider Rail',   desc: 'Linear slide constraint' },
]

function JointPicker() {
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
            className={`w-full flex items-center justify-between gap-3 p-3 rounded-none border-2 text-left transition-all duration-150 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${isActive ? 'bg-secondary border-black' : 'bg-white border-black hover:bg-secondary'}`}
          >
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-lg text-black`}>{icon}</span>
              <div>
                <p className={`text-xs font-label font-bold text-black`}>{label}</p>
                <p className="text-[9px] font-label text-zinc-700 uppercase tracking-wider">{desc}</p>
              </div>
            </div>
            {isActive && <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />}
          </button>
        )
      })}
      <p className="text-[9px] font-label text-zinc-700 uppercase tracking-widest text-center pt-1">Click to equip, then click bodies</p>
    </div>
  )
}

/* ────────── Locks Picker Inline Component ────────── */
const LOCK_OPTIONS = [
  { id: 'pin',         icon: 'push_pin',     label: 'Pin Body',        desc: 'Fix position, allow rotation' },
  { id: 'freeze',      icon: 'lock',         label: 'Freeze Solid',   desc: 'Fix position & rotation' },
  { id: 'axis-x',     icon: 'swap_horiz',   label: 'Lock X-axis',    desc: 'Allow only vertical movement' },
  { id: 'axis-y',     icon: 'swap_vert',    label: 'Lock Y-axis',    desc: 'Allow only horizontal movement' },
]

function LocksPicker() {
  const { activeTool, setActiveTool } = useSimulationStore()

  return (
    <div className="space-y-2">
      {LOCK_OPTIONS.map(({ id, icon, label, desc }) => {
        const isActive = activeTool?.category === 'lock' && activeTool.type === id
        return (
          <button
            key={id}
            onClick={() => setActiveTool(isActive ? null : { category: 'lock', type: id })}
            className={`w-full flex items-center gap-3 p-3 rounded-none border-2 text-left transition-all duration-150 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${isActive ? 'bg-tertiary border-black' : 'bg-white border-black hover:bg-tertiary'}`}
          >
            <span className={`material-symbols-outlined text-lg text-black`}>{icon}</span>
            <div>
              <p className={`text-xs font-label font-bold text-black`}>{label}</p>
              <p className="text-[9px] font-label text-zinc-700 uppercase tracking-wider">{desc}</p>
            </div>
            {isActive && <span className="ml-auto w-2 h-2 rounded-full bg-tertiary animate-pulse" />}
          </button>
        )
      })}
      <p className="text-[9px] font-label text-zinc-700 uppercase tracking-widest text-center pt-1">Click a body on canvas to apply</p>
    </div>
  )
}

/* ────────── Forces Picker Inline Component ────────── */
const FORCE_OPTIONS = [
  { id: 'gravity',   icon: 'keyboard_arrow_down', label: 'Custom Environment', desc: 'Control physics variables', color: 'text-amber-400' },
  { id: 'wind',      icon: 'air',                 label: 'Wind Force',         desc: 'Horizontal push on bodies', color: 'text-amber-400' },
  { id: 'manual',    icon: 'navigation',          label: 'Vector Force',       desc: 'Apply (i, j) force vector', color: 'text-amber-400' },
  { id: 'clear',     icon: 'delete_sweep',        label: 'Clear Forces',       desc: 'Remove all force vectors',  color: 'text-amber-400' },
]

function ForcesPicker() {
  const { 
    gravityScale, setGravityScale, 
    groundFriction, setGroundFriction,
    staticFriction, setStaticFriction,
    activeForceTool, setActiveForceTool,
    manualForceVector, setManualForceVector
  } = useSimulationStore()

  const [isEditingGravity, setIsEditingGravity] = useState(false)
  const [gravityInput, setGravityInput] = useState(gravityScale.toFixed(1))

  const [isEditingFriction, setIsEditingFriction] = useState(false)
  const [frictionInput, setFrictionInput] = useState((groundFriction || 0.1).toFixed(2))

  const [isEditingStatic, setIsEditingStatic] = useState(false)
  const [staticInput, setStaticInput] = useState((staticFriction || 0.5).toFixed(2))

  const handleGravitySliderChange = (e) => { const v = parseFloat(e.target.value); setGravityScale(v); setGravityInput(v.toFixed(1)) }
  const handleGravityInputChange = (e) => { setGravityInput(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v)) setGravityScale(Math.max(0, Math.min(3, v))) }
  const handleGravityBlur = () => { setIsEditingGravity(false); const v = parseFloat(gravityInput); if (isNaN(v)) setGravityInput(gravityScale.toFixed(1)); else { const clamped = Math.max(0, Math.min(3, v)); setGravityScale(clamped); setGravityInput(clamped.toFixed(1)) } }

  const handleFrictionSliderChange = (e) => { const v = parseFloat(e.target.value); setGroundFriction(v); setFrictionInput(v.toFixed(2)) }
  const handleFrictionInputChange = (e) => { setFrictionInput(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v)) setGroundFriction(Math.max(0, Math.min(1, v))) }
  const handleFrictionBlur = () => { setIsEditingFriction(false); const v = parseFloat(frictionInput); if (isNaN(v)) setFrictionInput((groundFriction || 0.1).toFixed(2)); else { const clamped = Math.max(0, Math.min(1, v)); setGroundFriction(clamped); setFrictionInput(clamped.toFixed(2)) } }

  const handleStaticSliderChange = (e) => { const v = parseFloat(e.target.value); setStaticFriction(v); setStaticInput(v.toFixed(2)) }
  const handleStaticInputChange = (e) => { setStaticInput(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v)) setStaticFriction(Math.max(0, Math.min(2, v))) }
  const handleStaticBlur = () => { setIsEditingStatic(false); const v = parseFloat(staticInput); if (isNaN(v)) setStaticInput((staticFriction || 0.5).toFixed(2)); else { const clamped = Math.max(0, Math.min(2, v)); setStaticFriction(clamped); setStaticInput(clamped.toFixed(2)) } }

  return (
    <div className="space-y-3">
      {FORCE_OPTIONS.map(({ id, icon, label, desc, color }) => {
        const isActive = activeForceTool === id || (id === 'gravity' && activeForceTool === null) 
        return (
          <div key={id} className="space-y-2">
            <button onClick={() => setActiveForceTool(isActive && id !== 'gravity' ? null : id)} className={`w-full flex items-center gap-3 p-3 rounded-none border-2 text-left transition-all duration-150 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${isActive ? 'bg-secondary border-black' : 'bg-white border-black hover:bg-secondary'}`}>
              <span className={`material-symbols-outlined text-lg text-black`}>{icon}</span>
              <div>
                <p className={`text-xs font-label font-bold text-black`}>{label}</p>
                <p className="text-[9px] font-label text-zinc-700 uppercase tracking-wider">{desc}</p>
              </div>
              {isActive && id !== 'gravity' && <span className="ml-auto w-2 h-2 rounded-full bg-black animate-pulse" />}
            </button>

            {isActive && id === 'gravity' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-1 border-l-4 border-black pl-2 ml-1">
                <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/15 mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-label text-zinc-400 uppercase tracking-widest">Gravity Scale</span>
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" max="3" step="0.1" value={isEditingGravity ? gravityInput : gravityScale.toFixed(1)} onFocus={() => { setIsEditingGravity(true); setGravityInput(gravityScale.toString()) }} onChange={handleGravityInputChange} onBlur={handleGravityBlur} className="w-12 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px] font-headline font-bold text-amber-400 focus:border-amber-400/50 outline-none transition-all text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <span className="text-[10px] font-headline font-bold text-amber-400/50">×</span>
                    </div>
                  </div>
                  <input type="range" min="0" max="3" step="0.1" value={gravityScale} onChange={handleGravitySliderChange} className="w-full accent-amber-400 cursor-pointer" />
                  <div className="flex justify-between text-[8px] text-zinc-700 font-label uppercase mt-1"><span>0× (zero-g)</span><span>3× (heavy)</span></div>
                </div>

                <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/15">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-label text-zinc-400 uppercase tracking-widest">Static Limit (μs)</span>
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" max="2" step="0.05" value={isEditingStatic ? staticInput : (staticFriction || 0.5).toFixed(2)} onFocus={() => { setIsEditingStatic(true); setStaticInput((staticFriction || 0.5).toString()) }} onChange={handleStaticInputChange} onBlur={handleStaticBlur} className="w-12 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px] font-headline font-bold text-amber-400 focus:border-amber-400/50 outline-none transition-all text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <span className="text-[10px] font-headline font-bold text-amber-400/50">μ</span>
                    </div>
                  </div>
                  <input type="range" min="0" max="2" step="0.05" value={staticFriction || 0.5} onChange={handleStaticSliderChange} className="w-full accent-amber-400 cursor-pointer" />
                  <div className="flex justify-between text-[8px] text-zinc-700 font-label uppercase mt-1"><span>0.0 (None)</span><span>2.0 (Glue)</span></div>
                </div>

                <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/15">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-label text-zinc-400 uppercase tracking-widest">Kinetic Slide (μk)</span>
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" max="1" step="0.05" value={isEditingFriction ? frictionInput : (groundFriction || 0.1).toFixed(2)} onFocus={() => { setIsEditingFriction(true); setFrictionInput((groundFriction || 0.1).toString()) }} onChange={handleFrictionInputChange} onBlur={handleFrictionBlur} className="w-12 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px] font-headline font-bold text-amber-400 focus:border-amber-400/50 outline-none transition-all text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <span className="text-[10px] font-headline font-bold text-amber-400/50">μ</span>
                    </div>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={groundFriction || 0.1} onChange={handleFrictionSliderChange} className="w-full accent-amber-400 cursor-pointer" />
                  <div className="flex justify-between text-[8px] text-zinc-700 font-label uppercase mt-1"><span>0.0 (Ice)</span><span>1.0 (Rubber)</span></div>
                </div>
              </div>
            )}

            {isActive && id === 'manual' && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-amber-400/5 border border-amber-400/10 rounded-lg animate-in fade-in slide-in-from-top-1 mt-2">
                <div>
                  <label className="text-[8px] font-label text-amber-400/60 uppercase tracking-widest block mb-1">i-Component (N)</label>
                  <input type="number" value={manualForceVector.i} onChange={(e) => setManualForceVector({...manualForceVector, i: parseFloat(e.target.value) || 0})} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-headline font-bold text-amber-400 focus:border-amber-400/50 outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-label text-amber-400/60 uppercase tracking-widest block mb-1">j-Component (N)</label>
                  <input type="number" value={manualForceVector.j} onChange={(e) => setManualForceVector({...manualForceVector, j: parseFloat(e.target.value) || 0})} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-headline font-bold text-amber-400 focus:border-amber-400/50 outline-none" />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ────────── Main ControlPalette Export ────────── */
const TAB_CONFIG = {
  objects: { title: 'Objects',      subtitle: 'Drag or click to spawn', icon: 'category',     color: 'text-primary'   },
  joints:  { title: 'Joints',       subtitle: 'Connect two bodies',     icon: 'link',         color: 'text-secondary' },
  locks:   { title: 'Locks & Pins', subtitle: 'Freeze body position',   icon: 'lock',         color: 'text-tertiary'  },
  forces:  { title: 'Applied Forces',subtitle: 'Gravity, wind & thrust', icon: 'dynamic_form', color: 'text-amber-400' },
}

export default function ControlPalette() {
  const [minimised, setMinimised] = useState(false)
  const { activeTab, activeExperimentConfig, activePage } = useSimulationStore()

  const cfg = (activeExperimentConfig && activePage === 'project')
    ? { title: 'Lab Controls', subtitle: activeExperimentConfig.title, icon: 'science', color: 'text-primary' }
    : (TAB_CONFIG[activeTab] ?? TAB_CONFIG.objects)

  if (minimised) {
    return (
      <div className="absolute left-4 top-4 z-30">
        <button onClick={() => setMinimised(false)} className="w-12 h-12 rounded-none bg-white border-4 border-black flex items-center justify-center hover:bg-secondary transition-colors shadow-brutal-sm hover:translate-x-[-2px] hover:translate-y-[-2px]">
          <span className={`material-symbols-outlined text-black text-lg`}>{cfg.icon}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="absolute left-4 top-4 z-30 w-64 flex flex-col gap-0 select-none">
      <div className="bg-white rounded-none border-4 border-black shadow-brutal overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b-4 border-black flex items-center justify-between bg-primary">
          <div className="flex items-center gap-2.5">
            <span className={`material-symbols-outlined text-black text-lg`}>{cfg.icon}</span>
            <div>
              <h3 className={`text-[11px] font-headline font-black text-black uppercase tracking-[0.12em]`}>{cfg.title}</h3>
              <p className="text-[9px] font-label text-black/80 uppercase tracking-widest mt-0.5">{cfg.subtitle}</p>
            </div>
          </div>
          <button onClick={() => setMinimised(true)} className="material-symbols-outlined text-black hover:text-white text-base transition-colors">remove</button>
        </div>

        {activePage !== 'project' && (
          <div className="flex border-b-4 border-black">
            {Object.entries(TAB_CONFIG).map(([id, t]) => (
              <div key={id} className={`flex-1 h-1 transition-all duration-300 ${activeTab === id ? 'bg-black' : 'bg-transparent'}`} />
            ))}
          </div>
        )}

        <div className="overflow-y-auto no-scrollbar max-h-[calc(100vh-240px)]">
          {activePage === 'project' ? (
            <ExperimentControls />
          ) : (
            <div className="p-4">
              {activeTab === 'objects' && <RigidBodyPicker />}
              {activeTab === 'joints'  && <JointPicker />}
              {activeTab === 'locks'   && <LocksPicker />}
              {activeTab === 'forces'  && <ForcesPicker />}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t-4 border-black flex gap-2 bg-surface">
          <button className={`flex-1 py-1.5 text-[10px] font-headline font-bold uppercase tracking-wider border-2 border-black rounded-none hover:shadow-button transition-all text-black hover:bg-error shadow-[1px_1px_0px_#000] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none bg-white`}>Clear All</button>
          <button className="flex-1 py-1.5 text-[10px] font-headline font-bold text-black uppercase tracking-wider bg-tertiary border-2 border-black rounded-none hover:bg-secondary transition-colors shadow-[1px_1px_0px_#000] hover:shadow-button active:translate-y-[1px] active:translate-x-[1px] active:shadow-none">Save Scene</button>
        </div>
      </div>
    </div>
  )
}