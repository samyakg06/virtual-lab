import { useState, useEffect } from 'react'
import Matter from 'matter-js'
import useSimulationStore from '../../store/simulationStore'

/* ─── Unit conversion constants ───────────────────────────────────
 *  1 pixel  = 5 mm = 0.005 m
 *  Objects are treated as 10 cm-thick slabs (depth) for volume.
 *  mass [kg] = density [kg/m³] × area [m²] × THICKNESS [m]
 * ──────────────────────────────────────────────────────────────── */
const PX_TO_M      = 0.005   // 1 px = 5 mm
const THICKNESS_M  = 0.1     // slab depth: 10 cm

function computeMass(body, densityKgM3) {
  const areaMsq = body.area * PX_TO_M * PX_TO_M
  return densityKgM3 * areaMsq * THICKNESS_M
}

/* ─── Material density presets ──────────────────────────────────── */
const MATERIAL_PRESETS = [
  { name: 'Cork',   density: 240,  color: 'text-amber-300'  },
  { name: 'Wood',   density: 600,  color: 'text-amber-500'  },
  { name: 'Alum.',  density: 2700, color: 'text-zinc-400'   },
  { name: 'Iron',   density: 7874, color: 'text-zinc-200'   },
]

/* ─── Sub-components ─────────────────────────────────────────────── */
function StaticProp({ label, value, accent }) {
  return (
    <div>
      <p className="text-[8px] font-label text-zinc-600 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className={`text-sm font-headline font-bold ${accent ?? 'text-on-surface'} leading-none`}>
        {value}
      </p>
    </div>
  )
}

function EditProp({ label, value, min, max, step, onChange, unit, decimals }) {
  const [localVal, setLocalVal] = useState(value)
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(value.toString())

  useEffect(() => { 
    if (!isEditing) {
      setLocalVal(value)
      setInputValue(value.toString())
    }
  }, [value, isEditing])

  const dp = decimals ?? (step < 0.1 ? 3 : step < 1 ? 2 : 1)

  const handleSliderChange = (e) => {
    const v = parseFloat(e.target.value)
    setLocalVal(v)
    setInputValue(v.toString())
    onChange(v)
  }

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    const v = parseFloat(e.target.value)
    if (!isNaN(v)) {
      const clamped = Math.max(min, Math.min(max, v))
      setLocalVal(clamped)
      onChange(clamped)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)
    const v = parseFloat(inputValue)
    if (isNaN(v)) {
      setInputValue(value.toString())
      setLocalVal(value)
    } else {
      const clamped = Math.max(min, Math.min(max, v))
      setLocalVal(clamped)
      setInputValue(clamped.toFixed(dp))
      onChange(clamped)
    }
  }

  return (
    <div className="col-span-2 flex flex-col gap-1.5 mb-2">
      <div className="flex items-center justify-between">
        <p className="text-[8px] font-label text-zinc-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={isEditing ? inputValue : localVal.toFixed(dp)}
            min={min}
            max={max}
            step={step}
            onFocus={() => { setIsEditing(true); setInputValue(localVal.toString()) }}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] font-headline font-bold text-on-surface focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-[10px] font-headline font-bold text-zinc-600">{unit}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={localVal} onChange={handleSliderChange}
        className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none outline-none cursor-pointer hover:bg-white/20 transition-colors"
      />
    </div>
  )
}

/* ─── Computed‑mass read‑only row ────────────────────────────────── */
function ComputedMassRow({ mass }) {
  return (
    <div className="col-span-2 flex items-center justify-between px-3 py-2 mb-2 rounded-lg bg-primary/5 border border-primary/15">
      <div>
        <p className="text-[8px] font-label text-zinc-500 uppercase tracking-wider">
          Mass <span className="normal-case text-zinc-700">(ρ × A × d)</span>
        </p>
        <p className="text-[8px] font-label text-zinc-700 mt-0.5">computed · read-only</p>
      </div>
      <p className="text-base font-headline font-black text-primary">
        {mass.toFixed(3)} <span className="text-xs font-normal text-zinc-500">kg</span>
      </p>
    </div>
  )
}

/* ─── Main export ────────────────────────────────────────────────── */
export default function ObjectPropertiesTable({ activeEntity, type, isInspected }) {
  const { runState, removeEntity, setInspectedEntity } = useSimulationStore()
  const isActive = runState === 'running' || runState === 'slowmo'

  // Size in metres
  const [sizeM, setSizeM] = useState(0.29)   // 58 px × 0.005

  // Density in kg/m³ (stored on the body as b.customDensity)
  const [density, setDensity] = useState(600) // wood default

  // Sync state when a new body is selected
  useEffect(() => {
    if (type === 'body' && activeEntity) {
      const base    = activeEntity.initialSize || 58
      const current = base * (activeEntity.customScale || 1)
      setSizeM(current * PX_TO_M)

      // Derive initial density from existing mass/area if not yet set
      if (!activeEntity.customDensity) {
        const areaMsq = activeEntity.area * PX_TO_M * PX_TO_M
        activeEntity.customDensity = Math.round(activeEntity.mass / (areaMsq * THICKNESS_M))
      }
      setDensity(activeEntity.customDensity)
    }
  }, [activeEntity?.id, type])

  // Periodic re-render while running (so live velocity/speed stays fresh)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isActive || !isInspected) return
    const id = setInterval(() => setTick(t => t + 1), 500)
    return () => clearInterval(id)
  }, [isActive, isInspected])

  /* ── Empty state ── */
  if (!activeEntity) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <StaticProp label="Value"  value="—" />
        <StaticProp label="Status" value="IDLE" accent="text-zinc-600" />
      </div>
    )
  }

  /* ── Constraint inspector ── */
  if (type === 'constraint') {
    const c = activeEntity
    return (
      <div className={isInspected ? 'flex flex-col' : 'grid grid-cols-2 gap-x-4 gap-y-3'}>
        {isInspected ? (
          <>
            <EditProp
              label="Stiffness (Spring Constant)"
              value={c.stiffness} min={0.001} max={1} step={0.01}
              onChange={v => { c.stiffness = v }} unit="k"
            />
            {c.length !== undefined && (
              <EditProp
                label="Rest Length"
                value={c.length} min={0} max={1000} step={1}
                onChange={v => { c.length = v }} unit="px"
              />
            )}
          </>
        ) : (
          <>
            <StaticProp label="Stiffness" value={c.stiffness?.toFixed(2)} />
            <StaticProp label="Length"    value={c.length?.toFixed(0) ?? '—'} />
          </>
        )}

        {isInspected && (
          <div className="col-span-2 mt-4 pt-3 border-t border-white/[0.05]">
            <button
              onClick={() => { removeEntity('constraint', c); setInspectedEntity(null) }}
              className="w-full flex justify-center items-center gap-1.5 px-3 py-2 text-[10px] font-label font-bold tracking-widest uppercase text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors border border-red-400/20"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Remove Joint
            </button>
          </div>
        )}
      </div>
    )
  }

  /* ── Body inspector ── */
  const b   = activeEntity

  /* ── Pulley wheel: only show delete button ── */
  if (b.label === 'pulleyWheel' || b.label === 'PulleyWheel') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-400/5 border border-cyan-400/15">
          <span className="material-symbols-outlined text-cyan-400 text-lg">trip_origin</span>
          <div>
            <p className="text-xs font-headline font-bold text-cyan-400">Pulley Wheel</p>
            <p className="text-[8px] font-label text-zinc-500 uppercase tracking-wider">Static • Frictionless</p>
          </div>
        </div>
        {isInspected && (
          <button
            onClick={() => { removeEntity('body', b); setInspectedEntity(null) }}
            className="w-full flex justify-center items-center gap-1.5 px-3 py-2 text-[10px] font-label font-bold tracking-widest uppercase text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors border border-red-400/20"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Delete Pulley
          </button>
        )}
      </div>
    )
  }

  const spd = Math.sqrt(b.velocity.x ** 2 + b.velocity.y ** 2).toFixed(2)
  const computedMass = computeMass(b, density)

  const sizeLabel = b.label === 'sphere' ? 'Radius (m)' : 'Size / Width (m)'

  return (
    <div className={isInspected ? 'flex flex-col gap-1' : 'grid grid-cols-2 gap-x-4 gap-y-3'}>
      {isInspected ? (
        <>
          {/* ── Size slider (metres) ── */}
          <EditProp
            label={sizeLabel}
            value={sizeM} min={0.05} max={1.5} step={0.005}
            decimals={3}
            onChange={vM => {
              const base        = b.initialSize || 58
              const targetPx    = vM / PX_TO_M
              const targetScale = targetPx / base
              const factor      = targetScale / (b.customScale || 1)

              Matter.Body.scale(b, factor, factor)
              b.customScale = targetScale
              setSizeM(vM)

              // Re-derive mass from density after scale (area has changed)
              const newMass = computeMass(b, density)
              Matter.Body.setMass(b, newMass)
            }}
            unit="m"
          />

          {/* ── Density slider (kg/m³) ── */}
          <EditProp
            label="Density"
            value={density} min={100} max={12000} step={50}
            decimals={0}
            onChange={v => {
              b.customDensity = v
              setDensity(v)
              Matter.Body.setMass(b, computeMass(b, v))
            }}
            unit="kg/m³"
          />

          {/* ── Material preset quick-picks ── */}
          <div className="col-span-2 flex gap-1.5 mb-2 -mt-1">
            {MATERIAL_PRESETS.map(({ name, density: d, color }) => (
              <button
                key={name}
                onClick={() => {
                  b.customDensity = d
                  setDensity(d)
                  Matter.Body.setMass(b, computeMass(b, d))
                }}
                className={`flex-1 py-1 text-[8px] font-label font-bold uppercase tracking-wider rounded border transition-all
                  ${density === d
                    ? `${color} border-current/40 bg-current/10`
                    : 'text-zinc-600 border-outline-variant/15 bg-surface-container-low hover:border-outline-variant/30'
                  }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* ── Mass slider (kg) ── */}
          <EditProp
            label="Mass"
            value={b.mass} min={0.1} max={100} step={0.1}
            decimals={2}
            onChange={v => {
              Matter.Body.setMass(b, v)
              // Update density to match the new mass (density = mass / volume)
              const areaMsq = b.area * PX_TO_M * PX_TO_M
              const newDensity = v / (areaMsq * THICKNESS_M)
              b.customDensity = newDensity
              setDensity(newDensity)
            }}
            unit="kg"
          />

          {/* ── Dynamics Analysis (F = ma) ── */}
          <div className="col-span-2 mt-2 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-label text-zinc-500 uppercase tracking-widest">Dynamics Analysis</span>
              <span className="text-[8px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">F = m × a</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StaticProp 
                label="Net Force (ΣF)" 
                value={`${(() => {
                  const fx = b.appliedForces?.reduce((acc, f) => acc + f.i, 0) || 0
                  const fy = b.appliedForces?.reduce((acc, f) => acc + f.j, 0) || 0
                  return Math.sqrt(fx*fx + fy*fy).toFixed(2)
                })()} N`}
                accent="text-amber-400"
              />
              <StaticProp 
                label="Acceleration (a)" 
                value={`${(() => {
                  const fx = b.appliedForces?.reduce((acc, f) => acc + f.i, 0) || 0
                  const fy = b.appliedForces?.reduce((acc, f) => acc + f.j, 0) || 0
                  const mag = Math.sqrt(fx*fx + fy*fy)
                  // Scaling factor 10 to match simulation physics units
                  return (mag / (b.mass || 1) * 10).toFixed(2)
                })()} m/s²`}
                accent="text-primary"
              />
            </div>

            {/* List of active vectors */}
            {b.appliedForces?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/[0.05] flex flex-wrap gap-2">
                {b.appliedForces.map((f, i) => (
                  <div key={i} className="text-[8px] font-mono text-zinc-500 bg-white/5 py-0.5 px-1.5 rounded">
                    F{i+1}: ({f.i}i, {f.j}j)
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Friction & Restitution ── */}
          <EditProp
            label="Friction"
            value={b.friction} min={0} max={1} step={0.05}
            onChange={v => { b.friction = v }} unit="μ"
          />
          <EditProp
            label="Restitution (Bounce)"
            value={b.restitution} min={0} max={1} step={0.05}
            onChange={v => { b.restitution = v }} unit="e"
          />

          {/* ── Action buttons ── */}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => Matter.Body.setAngularVelocity(b, b.angularVelocity > 0 ? 0 : 0.2)}
              className="px-3 py-1.5 text-[10px] font-label font-bold tracking-widest uppercase bg-surface-container-high hover:bg-white/10 rounded-lg transition-colors border border-outline-variant/20"
            >
              {b.angularVelocity === 0 ? 'Give Spin' : 'Stop Spin'}
            </button>
            <button
              onClick={() => Matter.Body.setVelocity(b, { x: 0, y: 0 })}
              className="px-3 py-1.5 flex-1 text-[10px] font-label font-bold tracking-widest uppercase bg-surface-container-high hover:bg-white/10 rounded-lg transition-colors border border-outline-variant/20"
            >
              Stop Motion
            </button>
          </div>

          {/* ── Delete ── */}
          <div className="col-span-2 mt-3 pt-3 border-t border-white/[0.05]">
            <button
              onClick={() => { removeEntity('body', b); setInspectedEntity(null) }}
              className="w-full flex justify-center items-center gap-1.5 px-3 py-2 text-[10px] font-label font-bold tracking-widest uppercase text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors border border-red-400/20"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Delete Object
            </button>
          </div>
        </>
      ) : (
        /* ── Compact live view (not inspected) ── */
        <>
          <StaticProp label="Mass"        value={`${b.mass.toFixed(2)} kg`} />
          <StaticProp label="Speed"       value={`${spd} m/s`} />
          <StaticProp label="Friction"    value={`${b.friction.toFixed(2)} μ`} />
          <StaticProp label="Restitution" value={b.restitution.toFixed(2)} />
        </>
      )}
    </div>
  )
}
