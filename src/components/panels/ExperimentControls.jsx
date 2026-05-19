import { useState, useEffect } from 'react'
import useSimulationStore from '../../store/simulationStore'
import { getEngine } from '../../physics/engineInstance'
import Matter from 'matter-js'

export default function ExperimentControls() {
  const { activeExperimentConfig } = useSimulationStore()
  const [engineUpdateTick, setEngineUpdateTick] = useState(0)
  const [angleInputText, setAngleInputText] = useState(null)

  // Force re-render periodically to stay in sync with the physics engine
  useEffect(() => {
    const interval = setInterval(() => setEngineUpdateTick(t => t + 1), 500)
    return () => clearInterval(interval)
  }, [])

  if (!activeExperimentConfig || !activeExperimentConfig.customUI) return null

  const engine = getEngine()
  const bodies = engine ? Matter.Composite.allBodies(engine.world) : []
  const constraints = engine ? Matter.Composite.allConstraints(engine.world) : []

  const updateBodyMass = (label, mass) => {
    const body = bodies.find(b => b.label === label)
    if (body) Matter.Body.setMass(body, mass)
  }

  /* ──────────────────── PENDULUM ──────────────────── */
  const renderPendulumControls = () => {
    const bob = bodies.find(b => b.label === 'PendulumBob')
    const beam = bodies.find(b => b.label === 'PendulumBeam')
    // Find the rope constraint connecting beam to bob
    const ropeConstraint = constraints.find(c =>
      (c.bodyA === beam && c.bodyB === bob) ||
      (c.bodyA === bob && c.bodyB === beam)
    )

    const currentLength = ropeConstraint ? Math.round(ropeConstraint.length) : 250
    const currentMass = bob ? bob.mass : 5
    const currentDamping = bob ? bob.frictionAir : 0.005

    // Calculate current angle from vertical
    const dx = bob && beam ? bob.position.x - beam.position.x : 0
    const dy = bob && beam ? bob.position.y - beam.position.y : 1
    const currentAngleRad = Math.atan2(dx, dy)
    const currentAngleDeg = bob && beam ? Math.round(currentAngleRad * (180 / Math.PI)) : 30
    
    // We only want to adjust initial angle when idle
    const isRunning = useSimulationStore(state => state.runState) !== 'idle'

    return (
      <div className="flex flex-col gap-4 mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Pendulum Controls</h3>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-zinc-400">Initial Angle (°)</label>
            <input
              type="text"
              inputMode="numeric"
              className="w-20 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-2 py-1.5 focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
              value={angleInputText !== null ? angleInputText : currentAngleDeg}
              disabled={isRunning}
              onFocus={() => setAngleInputText(String(currentAngleDeg))}
              onBlur={() => setAngleInputText(null)}
              onChange={(e) => {
                const raw = e.target.value
                setAngleInputText(raw)

                // Allow typing in progress (empty, minus sign, etc.)
                if (raw === '' || raw === '-') return

                const parsed = parseFloat(raw)
                if (isNaN(parsed)) return

                // Normalize: wrap into -180..180 range
                let effective = parsed % 360
                if (effective > 180) effective -= 360
                if (effective < -180) effective += 360

                const rad = effective * (Math.PI / 180)
                if (bob && beam) {
                  const ropeLen = ropeConstraint ? ropeConstraint.length : 250
                  const newX = beam.position.x + Math.sin(rad) * ropeLen
                  const newY = beam.position.y + Math.cos(rad) * ropeLen
                  Matter.Body.setPosition(bob, { x: newX, y: newY })
                  Matter.Body.setVelocity(bob, { x: 0, y: 0 })
                  Matter.Body.setAngularVelocity(bob, 0)
                }
              }}
            />
          </div>
          {!isRunning && (
            <span className="text-[8px] text-zinc-600 italic">Type any angle. Values &gt; 360° are wrapped.</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400">Rope Length (m)</label>
          <input
            type="number" step="0.05" min="0.5" max="5.0"
            className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
            value={currentLength ? Number((currentLength / 100).toFixed(2)) : 2.5}
            disabled={isRunning}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value)
              if (isNaN(parsed)) return
              const newLen = Math.max(50, Math.min(500, Math.round(parsed * 100)))
              if (ropeConstraint) ropeConstraint.length = newLen
              // Reposition bob to preserve current angle
              if (bob && beam) {
                const newX = beam.position.x + Math.sin(currentAngleRad) * newLen
                const newY = beam.position.y + Math.cos(currentAngleRad) * newLen
                Matter.Body.setPosition(bob, { x: newX, y: newY })
                Matter.Body.setVelocity(bob, { x: 0, y: 0 })
              }
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400">Bob Mass (kg)</label>
          <input
            type="number" step="0.5" min="1" max="50"
            className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
            value={Number(currentMass.toFixed(1))}
            disabled={isRunning}
            onChange={(e) => updateBodyMass('PendulumBob', parseFloat(e.target.value) || 1)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400">Air Resistance</label>
          <input
            type="number" step="0.005" min="0" max="0.1"
            className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
            value={Number(currentDamping.toFixed(3))}
            disabled={isRunning}
            onChange={(e) => { if (bob) bob.frictionAir = parseFloat(e.target.value) || 0 }}
          />
        </div>

        <div className="text-[9px] text-zinc-600 leading-relaxed border-t border-white/5 pt-2">
          Adjust the initial angle and rope length, then press <b>RUN ▶</b>. The bob swings from its initial angle. Period T = 2π√(L/g) depends only on rope length, not mass.
        </div>
      </div>
    )
  }

  /* ──────────────────── PROJECTILE ──────────────────── */
  const renderProjectileControls = () => {
    const cannon = bodies.find(b => b.label === 'Launcher')
    const [angle, setAngle] = useState(45)
    const [speed, setSpeed] = useState(20)

    const handleFire = () => {
      if (!cannon || !engine) return
      const rad = angle * (Math.PI / 180)
      // Spawn projectile at the tip of the barrel
      const barrelLen = 50  // half the cannon width
      const px = cannon.position.x + Math.cos(-rad) * barrelLen
      const py = cannon.position.y + Math.sin(-rad) * barrelLen
      const proj = Matter.Bodies.circle(px, py, 12, {
        restitution: 0.4, friction: 0.2, frictionAir: 0.01, label: 'Projectile',
        render: { fillStyle: 'rgba(255, 0, 85, 0.5)', strokeStyle: '#ff0055', lineWidth: 2 }
      })
      proj.appliedForces = []
      Matter.Body.setVelocity(proj, {
        x: Math.cos(-rad) * speed * 0.5,
        y: Math.sin(-rad) * speed * 0.5
      })
      Matter.Composite.add(engine.world, proj)
    }

    return (
      <div className="flex flex-col gap-4 mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Projectile Controls</h3>
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400">Launch Angle (°)</label>
          <input
            type="number" min="5" max="85" value={angle}
            className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-secondary"
            onChange={(e) => {
              const a = parseInt(e.target.value) || 5
              setAngle(a)
              if (cannon) Matter.Body.setAngle(cannon, -a * (Math.PI / 180))
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400">Initial Speed (m/s)</label>
          <input type="number" min="5" max="50" value={speed} className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-secondary" onChange={(e) => setSpeed(parseInt(e.target.value) || 5)} />
        </div>
        <button onClick={handleFire} className="py-2 bg-secondary text-on-secondary rounded font-bold text-xs">
          🚀 FIRE
        </button>
        <button
          onClick={() => {
            // Remove all projectiles
            if (!engine) return
            const projs = Matter.Composite.allBodies(engine.world).filter(b => b.label === 'Projectile')
            projs.forEach(p => Matter.Composite.remove(engine.world, p))
          }}
          className="py-2 border border-outline-variant text-zinc-400 rounded font-bold text-xs hover:bg-white/5"
        >
          Clear Projectiles
        </button>
      </div>
    )
  }

  /* ──────────────────── PULLEY ──────────────────── */
  const renderPulleyControls = () => {
    const massA = bodies.find(b => b.label === 'HangingMassA')
    const massB = bodies.find(b => b.label === 'HangingMassB')

    return (
      <div className="flex flex-col gap-4 mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-tertiary">Pulley Controls</h3>
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400">Mass A (kg)</label>
          <input type="number" min="1" max="80" step="1" className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-tertiary" value={massA ? Number(massA.mass.toFixed(1)) : 10} onChange={(e) => updateBodyMass('HangingMassA', parseFloat(e.target.value) || 1)} />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400">Mass B (kg)</label>
          <input type="number" min="1" max="80" step="1" className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-tertiary" value={massB ? Number(massB.mass.toFixed(1)) : 10} onChange={(e) => updateBodyMass('HangingMassB', parseFloat(e.target.value) || 1)} />
        </div>
        <div className="text-[9px] text-zinc-600 mt-1 leading-relaxed">
          Make masses unequal and press RUN. The heavier side accelerates downward.
          <br/>a = g(m₂ − m₁) / (m₁ + m₂)
        </div>
      </div>
    )
  }

  /* ──────────────────── COLLISION ──────────────────── */
  const renderCollisionControls = () => {
    const sphereA = bodies.find(b => b.label === 'SphereA')
    const sphereB = bodies.find(b => b.label === 'SphereB')
    const ground = bodies.find(b => b.label === 'ground')
    const [speedA, setSpeedA] = useState('8')
    const [speedB, setSpeedB] = useState('-6')
    const [collisionType, setCollisionType] = useState('elastic')

    const COLLISION_TYPES = [
      { id: 'elastic', label: 'Perfectly Elastic', restitution: 1.0, color: 'text-green-400', desc: 'KE fully conserved (e=1)' },
      { id: 'partial', label: 'Partially Inelastic', restitution: 0.5, color: 'text-yellow-400', desc: 'Some KE lost as heat (e=0.5)' },
      { id: 'inelastic', label: 'Perfectly Inelastic', restitution: 0.0, color: 'text-red-400', desc: 'Max KE lost, objects stick (e=0)' },
    ]

    const activeType = COLLISION_TYPES.find(t => t.id === collisionType)

    // Store _pushSpeed on bodies so physics engine can read them on RUN
    useEffect(() => {
      if (sphereA) sphereA._pushSpeed = parseFloat(speedA) || 0
      if (sphereB) sphereB._pushSpeed = parseFloat(speedB) || 0
    }, [sphereA, sphereB, speedA, speedB])

    // Apply collision type restitution to both spheres
    useEffect(() => {
      const r = activeType?.restitution ?? 1.0
      if (sphereA) { 
        sphereA.restitution = r; sphereA.frictionAir = 0.001; sphereA.friction = 0.001;
        sphereA.customCollisionType = collisionType;
      }
      if (sphereB) { sphereB.restitution = r; sphereB.frictionAir = 0.001; sphereB.friction = 0.001 }
      if (ground) { ground.friction = 0.001; ground.frictionStatic = 0.001 }
    }, [sphereA, sphereB, ground, collisionType])

    const isRunning = useSimulationStore(state => state.runState) !== 'idle'

    return (
      <div className="flex flex-col gap-3 mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Collision Controls</h3>

        {/* ── Collision Type Selector ── */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-label text-zinc-500 uppercase tracking-widest">Collision Type</span>
          <div className="flex flex-col gap-1">
            {COLLISION_TYPES.map(type => (
              <button
                key={type.id}
                disabled={isRunning}
                onClick={() => setCollisionType(type.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all border text-[10px] font-bold disabled:opacity-50 ${
                  collisionType === type.id
                    ? `${type.color} bg-white/[0.06] border-current/30`
                    : 'text-zinc-500 border-white/[0.05] hover:border-white/10 hover:bg-white/[0.03]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${collisionType === type.id ? 'bg-current' : 'bg-zinc-700'}`} />
                {type.label}
              </button>
            ))}
          </div>
          {activeType && (
            <span className={`text-[8px] italic ${activeType.color} opacity-70`}>{activeType.desc}</span>
          )}
        </div>

        {/* ── Sphere A ── */}
        <div className="bg-[#0c1929] border border-[#1e3a5f] rounded-lg p-2.5 flex flex-col gap-2">
          <div className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest mb-1">Sphere A</div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-zinc-400">Mass (kg)</label>
            <input type="number" step="0.5" min="1" max="30" value={sphereA ? Number(sphereA.mass.toFixed(1)) : 3} disabled={isRunning} onChange={(e) => updateBodyMass('SphereA', parseFloat(e.target.value) || 1)} className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-[#38bdf8] disabled:opacity-40 disabled:cursor-not-allowed" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-zinc-400">Initial Velocity (m/s)</label>
            <input type="text" inputMode="numeric" value={speedA} disabled={isRunning} onChange={(e) => setSpeedA(e.target.value)} className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-[#38bdf8] disabled:opacity-40 disabled:cursor-not-allowed" />
          </div>
        </div>

        {/* ── Sphere B ── */}
        <div className="bg-[#1a0f0a] border border-[#5f3a1e] rounded-lg p-2.5 flex flex-col gap-2">
          <div className="text-[10px] font-bold text-[#f97316] uppercase tracking-widest mb-1">Sphere B</div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-zinc-400">Mass (kg)</label>
            <input type="number" step="0.5" min="1" max="50" value={sphereB ? Number(sphereB.mass.toFixed(1)) : 8} disabled={isRunning} onChange={(e) => updateBodyMass('SphereB', parseFloat(e.target.value) || 1)} className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-[#f97316] disabled:opacity-40 disabled:cursor-not-allowed" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-zinc-400">Initial Velocity (m/s)</label>
            <input type="text" inputMode="numeric" value={speedB} disabled={isRunning} onChange={(e) => setSpeedB(e.target.value)} className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-[#f97316] disabled:opacity-40 disabled:cursor-not-allowed" />
          </div>
        </div>

        <div className="text-[9px] text-zinc-600 leading-relaxed border-t border-white/5 pt-2">
          Choose collision type, set mass & velocity, then press <b>RUN ▶</b>.<br/>
          Positive velocity = Right, Negative velocity = Left. Momentum is <em>always</em> conserved.
        </div>
      </div>
    )
  }

  /* ──────────────────── SPRING / SHM ──────────────────── */
  const renderSpringControls = () => {
    const block = bodies.find(b => b.label === 'OscillatingBlock')
    const wallBody = bodies.find(b => b.label === 'Ceiling')
    const constraint = constraints.find(c =>
      (c.bodyA === wallBody && c.bodyB === block) ||
      (c.bodyA === block && c.bodyB === wallBody)
    )

    const currentStiffness = constraint ? constraint.stiffness : 0.02
    const currentMass = block ? block.mass : 5

    return (
      <div className="flex flex-col gap-4 mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Spring Controls</h3>
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400">Spring Stiffness (k)</label>
          <input
            type="number" min="0.005" max="0.1" step="0.005"
            className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-secondary"
            value={Number(currentStiffness.toFixed(3))}
            onChange={(e) => { if (constraint) constraint.stiffness = parseFloat(e.target.value) || 0.005 }}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400">Block Mass (kg)</label>
          <input type="number" min="1" max="50" step="0.5" className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-secondary" value={Number(currentMass.toFixed(1))} onChange={(e) => updateBodyMass('OscillatingBlock', parseFloat(e.target.value) || 1)} />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400">Damping</label>
          <input
            type="number" min="0" max="0.1" step="0.005"
            className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-secondary"
            value={block ? Number(block.frictionAir.toFixed(3)) : 0.01}
            onChange={(e) => { if (block) block.frictionAir = parseFloat(e.target.value) || 0 }}
          />
        </div>

        <button
          onClick={() => {
            if (block && wallBody) {
              // Pull the block 150px down from equilibrium and release
              const eqY = wallBody.position.y + 100 // approximate equilibrium
              Matter.Body.setPosition(block, { x: block.position.x, y: eqY + 150 })
              Matter.Body.setVelocity(block, { x: 0, y: 0 })
            }
          }}
          className="py-2 bg-secondary/20 text-secondary border border-secondary/30 rounded font-bold text-xs hover:bg-secondary/30"
        >
          Pull & Release
        </button>
      </div>
    )
  }

  /* ──────────────────── INCLINE ──────────────────── */
  const renderInclineControls = () => {
    const ramp = bodies.find(b => b.label === 'Ramp')
    const slider = bodies.find(b => b.label === 'Slider')

    return (
      <div className="flex flex-col gap-4 mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-tertiary">Incline Controls</h3>
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400">Slider Mass (kg)</label>
          <input type="number" min="1" max="50" step="0.5" className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-tertiary" value={slider ? Number(slider.mass.toFixed(1)) : 5} onChange={(e) => updateBodyMass('Slider', parseFloat(e.target.value) || 1)} />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400">Surface Friction (μ)</label>
          <input
            type="number" min="0" max="1" step="0.05"
            className="w-16 bg-surface text-center text-[11px] text-on-surface border border-outline-variant rounded px-1.5 py-1 focus:outline-none focus:border-tertiary"
            value={slider ? Number(slider.friction.toFixed(2)) : 0.3}
            onChange={(e) => {
              const f = parseFloat(e.target.value) || 0
              if (slider) { slider.friction = f; slider.frictionStatic = f * 1.2 }
              if (ramp) { ramp.friction = f; ramp.frictionStatic = f * 1.2 }
            }}
          />
        </div>

        <button
          onClick={() => {
            // Place slider back on the top of the ramp
            if (slider && ramp) {
              const topX = ramp.position.x - 40
              const topY = ramp.position.y - 80
              Matter.Body.setPosition(slider, { x: topX, y: topY })
              Matter.Body.setVelocity(slider, { x: 0, y: 0 })
              Matter.Body.setAngularVelocity(slider, 0)
              Matter.Body.setAngle(slider, 0)
            }
          }}
          className="py-2 bg-tertiary/20 text-tertiary border border-tertiary/30 rounded font-bold text-xs hover:bg-tertiary/30"
        >
          Reset Slider to Top
        </button>

        <div className="text-[9px] text-zinc-600 mt-1 leading-relaxed">
          Place the block on the ramp and press RUN. Gravity will pull it down the slope. Adjust friction to control sliding.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border-t border-outline-variant/20 bg-surface-container-low">
      {activeExperimentConfig.customUI === 'pendulum' && renderPendulumControls()}
      {activeExperimentConfig.customUI === 'projectile' && renderProjectileControls()}
      {activeExperimentConfig.customUI === 'pulley' && renderPulleyControls()}
      {activeExperimentConfig.customUI === 'collision' && renderCollisionControls()}
      {activeExperimentConfig.customUI === 'spring' && renderSpringControls()}
      {activeExperimentConfig.customUI === 'incline' && renderInclineControls()}
    </div>
  )
}
