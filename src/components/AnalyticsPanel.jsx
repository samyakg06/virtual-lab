import { useState, useEffect } from 'react'
import Matter from 'matter-js'
import EnergyBarChart from './charts/EnergyBarChart'
import useEnergyData from '../hooks/useEnergyData'
import useSimulationStore from '../store/simulationStore'
import ExperimentAnalytics from './panels/ExperimentAnalytics'
import { getEngine } from '../physics/engineInstance'

/* ─── Unit conversion constants ─────────────────────────────────── */
const PX_TO_M      = 0.005   // 1 px = 5 mm
const THICKNESS_M  = 0.1     // slab depth: 10 cm

function computeMass(body, densityKgM3) {
  const areaMsq = body.area * PX_TO_M * PX_TO_M
  return densityKgM3 * areaMsq * THICKNESS_M
}

const MATERIAL_PRESETS = [
  { name: 'Cork',   density: 240,  color: 'text-amber-300'  },
  { name: 'Wood',   density: 600,  color: 'text-amber-500'  },
  { name: 'Alum.',  density: 2700, color: 'text-zinc-400'   },
  { name: 'Iron',   density: 7874, color: 'text-zinc-200'   },
]

/* ─── Sub-components for Properties ──────────────────────────────── */
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
            className="w-16 bg-white border-2 border-black rounded-none px-1.5 py-0.5 text-[10px] font-headline font-bold text-black focus:bg-secondary outline-none transition-all text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-[10px] font-headline font-bold text-zinc-600">{unit}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={localVal} onChange={handleSliderChange}
        className="w-full accent-primary h-2 bg-black rounded-none appearance-none outline-none cursor-pointer hover:bg-zinc-800 transition-colors"
      />
    </div>
  )
}

/* ─── Object Inspector Inline Component ───────────────────────────── */
function ObjectPropertiesTable({ activeEntity, type, isInspected }) {
  const { runState, removeEntity, setInspectedEntity } = useSimulationStore()
  const isActive = runState === 'running' || runState === 'slowmo'

  const [sizeM, setSizeM] = useState(0.29)
  const [density, setDensity] = useState(600)

  useEffect(() => {
    if (type === 'body' && activeEntity) {
      const base    = activeEntity.initialSize || 58
      const current = base * (activeEntity.customScale || 1)
      setSizeM(current * PX_TO_M)

      if (!activeEntity.customDensity) {
        const areaMsq = activeEntity.area * PX_TO_M * PX_TO_M
        activeEntity.customDensity = Math.round(activeEntity.mass / (areaMsq * THICKNESS_M))
      }
      setDensity(activeEntity.customDensity)
    }
  }, [activeEntity?.id, type])

  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isActive || !isInspected) return
    const id = setInterval(() => setTick(t => t + 1), 500)
    return () => clearInterval(id)
  }, [isActive, isInspected])

  if (!activeEntity) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <StaticProp label="Value"  value="—" />
        <StaticProp label="Status" value="IDLE" accent="text-zinc-600" />
      </div>
    )
  }

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
            <div className="col-span-2 mt-4 pt-3 border-t-2 border-black">
              <button
                onClick={() => { removeEntity('constraint', c); setInspectedEntity(null) }}
                className="w-full flex justify-center items-center gap-1.5 px-3 py-2 text-[10px] font-label font-bold tracking-widest uppercase text-black bg-error hover:bg-error-container rounded-none transition-colors border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Remove Joint
              </button>
            </div>
          </>
        ) : (
          <>
            <StaticProp label="Stiffness" value={c.stiffness?.toFixed(2)} />
            <StaticProp label="Length"    value={c.length?.toFixed(0) ?? '—'} />
          </>
        )}
      </div>
    )
  }

  const b   = activeEntity

  /* ── Pulley wheel: only show delete button ── */
  if (b.label === 'pulleyWheel' || b.label === 'PulleyWheel') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-none bg-white border-2 border-black shadow-button">
          <span className="material-symbols-outlined text-black text-lg">trip_origin</span>
          <div>
            <p className="text-xs font-headline font-bold text-black">Pulley Wheel</p>
            <p className="text-[8px] font-label text-zinc-600 uppercase tracking-wider">Static • Frictionless</p>
          </div>
        </div>
        {isInspected && (
          <button
            onClick={() => { removeEntity('body', b); setInspectedEntity(null) }}
            className="w-full flex justify-center items-center gap-1.5 px-3 py-2 text-[10px] font-label font-bold tracking-widest uppercase text-black bg-error hover:bg-error-container rounded-none transition-colors border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
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
          <EditProp
            label={sizeLabel}
            value={sizeM} min={0.05} max={1.5} step={0.005} decimals={3} unit="m"
            onChange={vM => {
              const base        = b.initialSize || 58
              const targetPx    = vM / PX_TO_M
              const targetScale = targetPx / base
              const factor      = targetScale / (b.customScale || 1)
              Matter.Body.scale(b, factor, factor)
              b.customScale = targetScale
              setSizeM(vM)
              const newMass = computeMass(b, density)
              Matter.Body.setMass(b, newMass)
            }}
          />

          <EditProp
            label="Density"
            value={density} min={100} max={12000} step={50} decimals={0} unit="kg/m³"
            onChange={v => {
              b.customDensity = v
              setDensity(v)
              Matter.Body.setMass(b, computeMass(b, v))
            }}
          />

          <div className="col-span-2 flex gap-1.5 mb-2 -mt-1">
            {MATERIAL_PRESETS.map(({ name, density: d, color }) => (
              <button
                key={name}
                onClick={() => {
                  b.customDensity = d
                  setDensity(d)
                  Matter.Body.setMass(b, computeMass(b, d))
                }}
                className={`flex-1 py-1 text-[8px] font-label font-bold uppercase tracking-wider rounded-none border-2 border-black transition-all shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none
                  ${density === d
                    ? `bg-black text-white`
                    : 'bg-white text-black hover:bg-secondary'
                  }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* New feature: Mass manual slider that auto adjusts Density */}
          <EditProp
            label="Mass (Auto-adjusts Density)"
            value={computedMass} min={0.01} max={100} step={0.1} decimals={3} unit="kg"
            onChange={v => {
              const areaMsq = b.area * PX_TO_M * PX_TO_M
              const newDensity = v / (areaMsq * THICKNESS_M)
              b.customDensity = newDensity
              setDensity(newDensity)
              Matter.Body.setMass(b, v)
            }}
          />

          <div className="col-span-2 mt-2 p-3 bg-white border-2 border-black rounded-none shadow-[2px_2px_0px_#000]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-label text-zinc-600 uppercase tracking-widest">Dynamics Analysis</span>
              <span className="text-[8px] bg-secondary text-black px-1.5 py-0.5 rounded-none font-bold uppercase tracking-tighter border-2 border-black">F = m × a</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StaticProp 
                label="Net Force (ΣF)" 
                value={`${(() => {
                  const fx = b.appliedForces?.reduce((acc, f) => acc + f.i, 0) || 0
                  const fy = b.appliedForces?.reduce((acc, f) => acc + f.j, 0) || 0
                  return Math.sqrt(fx*fx + fy*fy).toFixed(2)
                })()} N`}
                accent="text-tertiary"
              />
              <StaticProp 
                label="Acceleration (a)" 
                value={`${(() => {
                  const fx = b.appliedForces?.reduce((acc, f) => acc + f.i, 0) || 0
                  const fy = b.appliedForces?.reduce((acc, f) => acc + f.j, 0) || 0
                  const mag = Math.sqrt(fx*fx + fy*fy)
                  return (mag / (b.mass || 1) * 10).toFixed(2)
                })()} m/s²`}
                accent="text-primary"
              />
            </div>
            {b.appliedForces?.length > 0 && (
              <div className="mt-2 pt-2 border-t-2 border-black flex flex-wrap gap-2">
                {b.appliedForces.map((f, i) => (
                  <div key={i} className="text-[8px] font-mono text-black border-2 border-black bg-surface py-0.5 px-1.5 rounded-none">
                    F{i+1}: ({f.i}i, {f.j}j)
                  </div>
                ))}
              </div>
            )}
          </div>

          <EditProp
            label="Friction"
            value={b.friction} min={0} max={1} step={0.05} unit="μ"
            onChange={v => { b.friction = v }} 
          />
          <EditProp
            label="Restitution (Bounce)"
            value={b.restitution} min={0} max={1} step={0.05} unit="e"
            onChange={v => { b.restitution = v }} 
          />

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => Matter.Body.setAngularVelocity(b, b.angularVelocity > 0 ? 0 : 0.2)}
              className="px-3 py-1.5 text-[10px] font-label font-bold tracking-widest uppercase bg-white hover:bg-secondary rounded-none transition-colors border-2 border-black shadow-[1px_1px_0px_#000] text-black active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              {b.angularVelocity === 0 ? 'Give Spin' : 'Stop Spin'}
            </button>
            <button
              onClick={() => Matter.Body.setVelocity(b, { x: 0, y: 0 })}
              className="px-3 py-1.5 flex-1 text-[10px] font-label font-bold tracking-widest uppercase bg-white hover:bg-secondary rounded-none transition-colors border-2 border-black shadow-[1px_1px_0px_#000] text-black active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              Stop Motion
            </button>
          </div>

          <div className="col-span-2 mt-3 pt-3 border-t-2 border-black">
            <button
              onClick={() => { removeEntity('body', b); setInspectedEntity(null) }}
              className="w-full flex justify-center items-center gap-1.5 px-3 py-2 text-[10px] font-label font-bold tracking-widest uppercase text-black bg-error hover:bg-error-container rounded-none transition-colors border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Delete Object
            </button>
          </div>
        </>
      ) : (
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

/* ─── Main AnalyticsPanel Export ────────────────────────────────── */
export default function AnalyticsPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const { chartData, topBody } = useEnergyData()
  const { runState, inspectedEntity, activeExperimentConfig, showAnalyticsPanel: open, setShowAnalyticsPanel: setOpen } = useSimulationStore()

  const isLive = runState === 'running' || runState === 'slowmo'
  const activeEntity = inspectedEntity || (topBody ? { type: 'body', entity: topBody } : null)

  useEffect(() => {
    if (inspectedEntity) {
      setOpen(true)
      setCollapsed(false)
    }
  }, [inspectedEntity])

  const showLegacyPanel = !activeExperimentConfig && open;
  const showInspector = !!inspectedEntity;

  // We still need to render the container for ExperimentAnalytics even if the legacy panel is hidden
  if (!activeExperimentConfig && !open) return null;

  return (
    <div className="absolute bottom-4 right-4 z-30 w-80 select-none flex flex-col gap-3">
      {(showLegacyPanel || showInspector) && (
        <div className="bg-white rounded-none border-4 border-black shadow-brutal overflow-hidden">
          <div className="px-4 py-3 border-b-4 border-black flex items-center justify-between bg-secondary">
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-black text-sm ${isLive ? '' : 'opacity-50'}`}>
                {showInspector ? 'tune' : 'analytics'}
              </span>
              <h4 className="text-[10px] font-headline font-bold text-black uppercase tracking-widest">
                {showInspector ? 'Object Inspector' : 'Live Diagnostics'}
              </h4>
              {isLive && (
                <span className="flex items-center gap-1 ml-1">
                  <span className="w-1.5 h-1.5 rounded-none border border-black bg-primary animate-pulse" />
                  <span className="text-[8px] font-label text-black uppercase tracking-widest">Live</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!activeExperimentConfig && (
                <button
                  onClick={() => setCollapsed((v) => !v)}
                  className="material-symbols-outlined text-black hover:text-white text-base transition-all duration-200"
                  style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  title={collapsed ? 'Expand' : 'Collapse'}
                >
                  expand_more
                </button>
              )}
              <button
                onClick={() => {
                  if (showInspector) setInspectedEntity(null);
                  else setOpen(false);
                }}
                className="material-symbols-outlined text-black hover:text-white text-base transition-colors"
                title="Close"
              >
                close
              </button>
            </div>
          </div>

          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: (collapsed && !showInspector) ? '0px' : '800px' }} 
          >
            {!showInspector && (
              <div className="px-3 py-3 border-b-4 border-black bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-label text-zinc-600 uppercase tracking-widest">
                    Energy over time
                  </span>
                  <div className="flex gap-3 text-[8px] font-label text-zinc-700 uppercase tracking-wider">
                    {chartData.length > 0 && (
                      <>
                        <span className="text-primary">
                          KE: {(chartData.at(-1)?.ke ?? 0).toFixed(1)} J
                        </span>
                        <span className="text-primary-fixed">
                          PE: {(chartData.at(-1)?.pe ?? 0).toFixed(1)} J
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <EnergyBarChart data={chartData} />
              </div>
            )}

            <div className="bg-surface px-4 py-3 border-b-4 border-black overflow-y-auto no-scrollbar max-h-[320px]">
              <h5 className="text-[8px] font-headline font-bold text-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">
                  {inspectedEntity ? 'tune' : (activeEntity ? 'speed' : 'radio_button_unchecked')}
                </span>
                {inspectedEntity ? 'Inspector' : 'Live Fastest Object'}
                {activeEntity?.entity && (
                  <span className="ml-auto text-black normal-case tracking-normal font-label font-normal">
                    #{activeEntity.entity.id}
                  </span>
                )}
              </h5>
              {/* INLINED TABLE */}
              <ObjectPropertiesTable activeEntity={activeEntity?.entity} type={activeEntity?.type} isInspected={!!inspectedEntity} />
            </div>

            {!showInspector && (
              <div className="px-4 py-2 bg-tertiary flex items-center justify-between">
                {[
                  { label: 'Simulations', value: '1' },
                  { label: 'Bodies',      value: String(
                    (getEngine()
                      ? Math.max(0, Matter.Composite.allBodies(getEngine().world).length)
                      : 0)
                  ).padStart(1, '0') },
                  { label: 'Elapsed',     value: runState !== 'idle' ? 'Live' : '0s' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center gap-0.5">
                    <span className="text-[8px] font-label text-zinc-700 uppercase tracking-widest">
                      {label}
                    </span>
                    <span className="text-xs font-headline font-semibold text-on-surface-variant">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      <ExperimentAnalytics />
    </div>
  )
}