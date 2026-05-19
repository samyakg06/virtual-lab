import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts'
import useSimulationStore from '../../store/simulationStore'
import { getEngine } from '../../physics/engineInstance'
import Matter from 'matter-js'

/* ── Shared chart styling ────────────────────────────────── */
const GRID_STYLE = { stroke: 'rgba(255,255,255,0.04)' }
const AXIS_STYLE = { fontSize: 9, fill: '#71717a', fontFamily: 'Inter, sans-serif' }
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15,15,15,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '10px',
  padding: '8px 12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
}

function StatCard({ label, value, unit, color, icon }) {
  return (
    <div className="flex flex-col gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5">
        {icon && <span className="material-symbols-outlined text-[12px]" style={{ color }}>{icon}</span>}
        <span className="text-[8px] font-label text-zinc-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-headline font-bold" style={{ color }}>{value}</span>
        {unit && <span className="text-[9px] text-zinc-600 font-label">{unit}</span>}
      </div>
    </div>
  )
}

function ChartSection({ title, color, children, height = 'h-44' }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <h4 className="text-[10px] font-headline font-bold uppercase tracking-wider text-zinc-300">{title}</h4>
      </div>
      <div className={`${height} bg-white/[0.02] border border-white/[0.05] rounded-lg p-2`}>
        {children}
      </div>
    </div>
  )
}

const formatTime = (t, data) => {
  if (!data || data.length === 0) return ''
  const start = data[0]?.time || 0
  return ((t - start) / 1000).toFixed(1) + 's'
}

export default function ExperimentAnalytics() {
  const { activeExperimentConfig, runState } = useSimulationStore()
  const [data, setData] = useState([])
  const [energySummary, setEnergySummary] = useState(null)

  /* ── Collision event hooks ── */
  useEffect(() => {
    if (activeExperimentConfig?.customUI !== 'collision') return
    const engine = getEngine()
    if (!engine) return

    let currentKE = null
    let keBefore = null
    const computeKE = (body) => {
      const v = Matter.Vector.magnitude(body.velocity)
      return 0.5 * body.mass * v * v + 0.5 * body.inertia * body.angularVelocity ** 2
    }

    const handleBeforeUpdate = () => {
      const engine = getEngine()
      if (!engine) return
      const sA = Matter.Composite.allBodies(engine.world).find(b => b.label === 'SphereA')
      const sB = Matter.Composite.allBodies(engine.world).find(b => b.label === 'SphereB')
      if (sA && sB) {
        currentKE = computeKE(sA) + computeKE(sB)
      }
    }

    const handleStart = (e) => {
      for (const pair of e.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label]
        if (labels.includes('SphereA') && labels.includes('SphereB')) {
          keBefore = currentKE
        }
      }
    }
    const handleEnd = (e) => {
      for (const pair of e.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label]
        if (labels.includes('SphereA') && labels.includes('SphereB') && keBefore !== null) {
          setTimeout(() => {
            const keAfter = computeKE(pair.bodyA) + computeKE(pair.bodyB)
            setEnergySummary({ keBefore, keAfter, heat: Math.max(0, keBefore - keAfter) })
            keBefore = null
          }, 80)
        }
      }
    }

    Matter.Events.on(engine, 'beforeUpdate', handleBeforeUpdate)
    Matter.Events.on(engine, 'collisionStart', handleStart)
    Matter.Events.on(engine, 'collisionEnd', handleEnd)
    return () => {
      Matter.Events.off(engine, 'beforeUpdate', handleBeforeUpdate)
      Matter.Events.off(engine, 'collisionStart', handleStart)
      Matter.Events.off(engine, 'collisionEnd', handleEnd)
    }
  }, [activeExperimentConfig])

  /* ── Continuous data collection ── */
  useEffect(() => {
    if (runState !== 'running' && runState !== 'slowmo') return
    if (!activeExperimentConfig) return

    const interval = setInterval(() => {
      const engine = getEngine()
      if (!engine) return
      const bodies = Matter.Composite.allBodies(engine.world)
      const t = Date.now()

      if (activeExperimentConfig.customUI === 'pendulum') {
        const bob = bodies.find(b => b.label === 'PendulumBob')
        const pivot = bodies.find(b => b.label === 'PendulumBeam')
        if (bob && pivot) {
          const v = Matter.Vector.magnitude(bob.velocity)
          // Stop recording if bob has practically stopped (damping/friction)
          if (v < 0.01 && data.length > 50) return

          const dx = bob.position.x - pivot.position.x
          const dy = bob.position.y - pivot.position.y
          const theta = Math.atan2(dx, dy) * (180 / Math.PI)
          const ropeLen = Math.sqrt(dx * dx + dy * dy) || 1
          const height = ropeLen - dy
          const ke = 0.5 * bob.mass * v * v
          const pe = bob.mass * 0.001 * height
          setData(prev => [...prev, { time: t, angle: +theta.toFixed(2), ke: +ke.toFixed(3), pe: +pe.toFixed(3), speed: +v.toFixed(2) }])
        }
      } else if (activeExperimentConfig.customUI === 'collision') {
        const sA = bodies.find(b => b.label === 'SphereA')
        const sB = bodies.find(b => b.label === 'SphereB')
        if (sA && sB) {
          const vA = Matter.Vector.magnitude(sA.velocity)
          const vB = Matter.Vector.magnitude(sB.velocity)
          
          // Only record if at least one sphere is still moving significantly
          // AND they are within a reasonable range of the visible canvas.
          // This prevents recording "stuck" jittering at the corners.
          const isOffScreen = (sA.position.x < -200 || sA.position.x > window.innerWidth + 200) &&
                              (sB.position.x < -200 || sB.position.x > window.innerWidth + 200);
          
          if (isOffScreen && data.length > 40) return;
          if (vA < 0.05 && vB < 0.05 && data.length > 20) return;

          const keA = 0.5 * sA.mass * vA * vA
          const keB = 0.5 * sB.mass * vB * vB
          // Momentum: p = m * v. We use the X component of velocity for directional momentum.
          const pA = sA.mass * sA.velocity.x
          const pB = sB.mass * sB.velocity.x
          setData(prev => [...prev, { 
            time: t, 
            keA: +keA.toFixed(3), 
            keB: +keB.toFixed(3), 
            keTotal: +(keA + keB).toFixed(3),
            pA: +pA.toFixed(3),
            pB: +pB.toFixed(3),
            pTotal: +(pA + pB).toFixed(3)
          }])
        }
      } else if (activeExperimentConfig.customUI === 'spring') {
        const block = bodies.find(b => b.label === 'OscillatingBlock')
        const ceiling = bodies.find(b => b.label === 'Ceiling')
        if (block && ceiling) {
          const v = Matter.Vector.magnitude(block.velocity)
          if (v < 0.01 && data.length > 50) return

          const dy = block.position.y - ceiling.position.y
          const ke = 0.5 * block.mass * v * v
          setData(prev => [...prev, { time: t, y: +dy.toFixed(1), speed: +v.toFixed(2), ke: +ke.toFixed(3) }])
        }
      } else if (activeExperimentConfig.customUI === 'incline') {
        const slider = bodies.find(b => b.label === 'Slider')
        if (slider) {
          const v = Matter.Vector.magnitude(slider.velocity)
          if (v < 0.01 && data.length > 20) return

          const ke = 0.5 * slider.mass * v * v
          setData(prev => [...prev, { time: t, v: +v.toFixed(2), ke: +ke.toFixed(3) }])
        }
      } else if (activeExperimentConfig.customUI === 'projectile') {
        const proj = bodies.find(b => b.label === 'Projectile')
        const ground = bodies.find(b => b.label === 'GroundPlane')
        if (proj) {
          const v = Matter.Vector.magnitude(proj.velocity)
          if (v < 0.05 && data.length > 10) return

          const groundY = ground ? ground.position.y : window.innerHeight * 0.88
          setData(prev => [...prev, { time: t, h: +Math.max(0, groundY - proj.position.y).toFixed(1), d: +proj.position.x.toFixed(1) }])
        }
      } else if (activeExperimentConfig.customUI === 'pulley') {
        const mA = bodies.find(b => b.label === 'HangingMassA')
        const mB = bodies.find(b => b.label === 'HangingMassB')
        if (mA && mB) {
          const vA = Math.abs(mA.velocity.y)
          const vB = Math.abs(mB.velocity.y)
          if (vA < 0.01 && vB < 0.01 && data.length > 20) return

          setData(prev => [...prev, {
            time: t,
            posA: +mA.position.y.toFixed(1), posB: +mB.position.y.toFixed(1),
            vA: +mA.velocity.y.toFixed(2), vB: +mB.velocity.y.toFixed(2)
          }])
        }
      }
    }, 80)
    return () => clearInterval(interval)
  }, [activeExperimentConfig, runState])

  useEffect(() => { setData([]); setEnergySummary(null) }, [activeExperimentConfig])

  if (!activeExperimentConfig) return null

  /* ── Live stats ── */
  const latest = data.length > 0 ? data[data.length - 1] : null

  const renderPendulum = () => (
    <div className="flex flex-col gap-4">
      {/* Live stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Angle" value={latest?.angle?.toFixed(1) ?? '—'} unit="°" color="#2ff5ff" icon="rotate_right" />
        <StatCard label="Speed" value={latest?.speed?.toFixed(2) ?? '—'} unit="m/s" color="#4ade80" icon="speed" />
        <StatCard label="KE" value={latest?.ke?.toFixed(3) ?? '—'} unit="J" color="#fbbf24" icon="bolt" />
      </div>

      <ChartSection title="Angular Displacement (θ°)" color="#2ff5ff">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="time" tickFormatter={t => formatTime(t, data)} tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={t => formatTime(t, data)} />
            <Line type="monotone" dataKey="angle" stroke="#2ff5ff" dot={false} strokeWidth={2} isAnimationActive={false} name="θ (°)" />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Energy Conservation (KE vs PE)" color="#4ade80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="time" tickFormatter={t => formatTime(t, data)} tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={t => formatTime(t, data)} />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '9px', fontFamily: 'Inter' }} />
            <Line type="monotone" dataKey="ke" stroke="#4ade80" dot={false} strokeWidth={1.5} isAnimationActive={false} name="Kinetic (KE)" />
            <Line type="monotone" dataKey="pe" stroke="#f97316" dot={false} strokeWidth={1.5} isAnimationActive={false} name="Potential (PE)" />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  )

  const renderCollision = () => (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="KE (A)" value={latest?.keA?.toFixed(2) ?? '—'} unit="J" color="#38bdf8" icon="circle" />
        <StatCard label="KE (B)" value={latest?.keB?.toFixed(2) ?? '—'} unit="J" color="#f97316" icon="circle" />
        <StatCard label="Total KE" value={latest?.keTotal?.toFixed(2) ?? '—'} unit="J" color="#4ade80" icon="functions" />
      </div>

      <ChartSection title="Kinetic Energy Over Time" color="#38bdf8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="time" tickFormatter={t => formatTime(t, data)} tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={t => formatTime(t, data)} />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '9px', fontFamily: 'Inter' }} />
            <Line type="monotone" dataKey="keA" stroke="#38bdf8" dot={false} strokeWidth={2} isAnimationActive={false} name="Sphere A (KE)" />
            <Line type="monotone" dataKey="keB" stroke="#f97316" dot={false} strokeWidth={2} isAnimationActive={false} name="Sphere B (KE)" />
            <Line type="monotone" dataKey="keTotal" stroke="#4ade80" dot={false} strokeWidth={1.5} strokeDasharray="4 2" isAnimationActive={false} name="Total KE" />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Momentum Over Time (P = mv)" color="#a855f7">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="time" tickFormatter={t => formatTime(t, data)} tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={t => formatTime(t, data)} />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '9px', fontFamily: 'Inter' }} />
            <Line type="monotone" dataKey="pA" stroke="#38bdf8" dot={false} strokeWidth={2} isAnimationActive={false} name="Sphere A (p)" />
            <Line type="monotone" dataKey="pB" stroke="#f97316" dot={false} strokeWidth={2} isAnimationActive={false} name="Sphere B (p)" />
            <Line type="monotone" dataKey="pTotal" stroke="#4ade80" dot={false} strokeWidth={1.5} strokeDasharray="4 2" isAnimationActive={false} name="Total p" />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Energy Balance Card */}
      <div className="bg-gradient-to-br from-[#0c1829] to-[#0a1220] border border-[#1e3a5f]/60 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-sm text-[#38bdf8]">energy_savings_leaf</span>
          <h4 className="text-[10px] font-headline font-bold uppercase text-[#38bdf8] tracking-widest">Energy Balance</h4>
        </div>
        {!energySummary ? (
          <div className="text-[10px] text-slate-500 text-center py-3 italic">
            Press RUN to launch the balls and see energy analysis after collision
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[
              { label: 'KE Before Collision', value: energySummary.keBefore.toFixed(3), unit: 'J', color: 'text-slate-200' },
              { label: 'KE After Collision', value: energySummary.keAfter.toFixed(3), unit: 'J', color: 'text-slate-200' },
              { label: 'Energy Lost (Heat)', value: energySummary.heat.toFixed(3), unit: 'J', color: energySummary.heat > 0.05 ? 'text-orange-400' : 'text-green-400' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="flex justify-between items-center text-[10px] border-b border-[#1e3a5f]/40 pb-1.5">
                <span className="text-slate-400">{label}</span>
                <span className={`font-bold font-headline ${color}`}>{value} {unit}</span>
              </div>
            ))}
            <div className="mt-2 text-[9px] text-center px-2 py-1.5 rounded-lg bg-white/[0.03]">
              {energySummary.heat < 0.05
                ? <span className="text-green-400">✅ Nearly elastic — kinetic energy conserved</span>
                : <span className="text-orange-400">⚡ Inelastic — {((energySummary.heat / energySummary.keBefore) * 100).toFixed(1)}% energy lost as heat</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderSpring = () => (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Displ." value={latest?.y?.toFixed(1) ?? '—'} unit="px" color="#ffb703" icon="swap_vert" />
        <StatCard label="Speed" value={latest?.speed?.toFixed(2) ?? '—'} unit="m/s" color="#2ff5ff" icon="speed" />
        <StatCard label="KE" value={latest?.ke?.toFixed(3) ?? '—'} unit="J" color="#4ade80" icon="bolt" />
      </div>

      <ChartSection title="Vertical Displacement" color="#ffb703">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="time" tickFormatter={t => formatTime(t, data)} tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={t => formatTime(t, data)} />
            <Line type="monotone" dataKey="y" stroke="#ffb703" dot={false} strokeWidth={2} isAnimationActive={false} name="y (px)" />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Speed Over Time" color="#2ff5ff">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="time" tickFormatter={t => formatTime(t, data)} tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={t => formatTime(t, data)} />
            <Line type="monotone" dataKey="speed" stroke="#2ff5ff" dot={false} strokeWidth={1.5} isAnimationActive={false} name="|v| (m/s)" />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  )

  const renderIncline = () => (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Speed" value={latest?.v?.toFixed(2) ?? '—'} unit="m/s" color="#a855f7" icon="speed" />
        <StatCard label="KE" value={latest?.ke?.toFixed(3) ?? '—'} unit="J" color="#4ade80" icon="bolt" />
      </div>

      <ChartSection title="Speed vs Time" color="#a855f7">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="time" tickFormatter={t => formatTime(t, data)} tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={t => formatTime(t, data)} />
            <Line type="monotone" dataKey="v" stroke="#a855f7" dot={false} strokeWidth={2} isAnimationActive={false} name="|v| (m/s)" />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Kinetic Energy" color="#4ade80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="time" tickFormatter={t => formatTime(t, data)} tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={t => formatTime(t, data)} />
            <Line type="monotone" dataKey="ke" stroke="#4ade80" dot={false} strokeWidth={1.5} isAnimationActive={false} name="KE (J)" />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  )

  const renderProjectile = () => (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Height" value={latest?.h?.toFixed(1) ?? '—'} unit="px" color="#ff0055" icon="height" />
        <StatCard label="Distance" value={latest?.d?.toFixed(1) ?? '—'} unit="px" color="#38bdf8" icon="straighten" />
      </div>

      <ChartSection title="Trajectory (Height vs Distance)" color="#ff0055">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="d" tick={AXIS_STYLE} tickLine={false} axisLine={false} label={{ value: 'Distance', position: 'insideBottom', offset: -2, style: { ...AXIS_STYLE, fontSize: 8 } }} />
            <YAxis dataKey="h" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line type="monotone" dataKey="h" stroke="#ff0055" dot={false} strokeWidth={2} isAnimationActive={false} name="Height" />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  )

  const renderPulley = () => (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Mass A (Y)" value={latest?.posA?.toFixed(1) ?? '—'} unit="px" color="#2ff5ff" icon="arrow_downward" />
        <StatCard label="Mass B (Y)" value={latest?.posB?.toFixed(1) ?? '—'} unit="px" color="#f43f5e" icon="arrow_downward" />
      </div>

      <ChartSection title="Position (Y) Over Time" color="#2ff5ff">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="time" tickFormatter={t => formatTime(t, data)} tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={t => formatTime(t, data)} />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '9px', fontFamily: 'Inter' }} />
            <Line type="monotone" dataKey="posA" stroke="#2ff5ff" dot={false} strokeWidth={2} isAnimationActive={false} name="Mass A" />
            <Line type="monotone" dataKey="posB" stroke="#f43f5e" dot={false} strokeWidth={2} isAnimationActive={false} name="Mass B" />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Velocity (Y) Over Time" color="#a855f7">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="time" tickFormatter={t => formatTime(t, data)} tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={t => formatTime(t, data)} />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '9px', fontFamily: 'Inter' }} />
            <Line type="monotone" dataKey="vA" stroke="#2ff5ff" dot={false} strokeWidth={1.5} isAnimationActive={false} name="Mass A (v)" />
            <Line type="monotone" dataKey="vB" stroke="#f43f5e" dot={false} strokeWidth={1.5} isAnimationActive={false} name="Mass B (v)" />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  )

  const charts = {
    pendulum: renderPendulum,
    collision: renderCollision,
    spring: renderSpring,
    incline: renderIncline,
    projectile: renderProjectile,
    pulley: renderPulley,
  }

  const renderer = charts[activeExperimentConfig.customUI]
  if (!renderer) return null

  return (
    <div className="mt-3 bg-surface-container-highest/60 backdrop-blur-md border border-white/[0.07] rounded-xl shadow-panel overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-primary">monitoring</span>
          <h3 className="text-[11px] font-headline font-bold text-on-surface uppercase tracking-widest">Lab Analytics</h3>
          {(runState === 'running' || runState === 'slowmo') && (
            <span className="flex items-center gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[8px] font-label text-green-400/70 uppercase tracking-widest">Recording</span>
            </span>
          )}
        </div>
        <span className="text-[9px] font-label text-zinc-600">{data.length} pts</span>
      </div>

      {/* Charts */}
      <div className="p-4 flex flex-col gap-4 max-h-[600px] overflow-y-auto no-scrollbar">
        {renderer()}
      </div>
    </div>
  )
}
