import { useEffect, useRef, useCallback } from 'react'
import Matter from 'matter-js'
import useSimulationStore from '../store/simulationStore.js'
import { registerEngine } from '../physics/engineInstance.js'

const {
  Engine, Render, Runner, Bodies, Body,
  Composite, Mouse, MouseConstraint, Events, Constraint, Vector, Query
} = Matter

/* ── Brutalist render styles per body type ── */
const BODY_STYLES = {
  block: { fillStyle: '#FF8E8B', strokeStyle: '#000000', lineWidth: 4 }, // Pastel Salmon Pink
  sphere: { fillStyle: '#F4D06F', strokeStyle: '#000000', lineWidth: 4 }, // Pastel Mustard Yellow
  pentagon: { fillStyle: '#B5D99C', strokeStyle: '#000000', lineWidth: 4 }, // Pastel Sage Green
  wedge: { fillStyle: '#EF476F', strokeStyle: '#000000', lineWidth: 4 }, // Muted Red
  ground: { fillStyle: '#FFFFFF', strokeStyle: '#000000', lineWidth: 4 },
  wall: { fillStyle: '#EAEAEA', strokeStyle: '#000000', lineWidth: 4 },
}

export default function usePhysicsEngine(canvasRef, containerRef) {
  const engineRef  = useRef(null)
  const renderRef  = useRef(null)
  const runnerRef  = useRef(null)

  const { runState } = useSimulationStore()

  /* ─────────────────────────── INIT ─────────────────────────── */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const { width, height } = containerRef.current.getBoundingClientRect()

    const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0012 } })
    engine.enableSleeping = true // enable sleeping to prevent micro-jitter on the ground
    Matter.Resolver._restingThresh = 0.001 // allow objects to bounce even at very low relative velocities
    engineRef.current = engine
    registerEngine(engine)

    const render = Render.create({
      canvas:  canvasRef.current,
      engine,
      options: {
        width, height, background: 'transparent', wireframes: false,
        showSleeping: false,
        pixelRatio: window.devicePixelRatio || 1,
      },
    })
    renderRef.current = render

    const runner = Runner.create()
    runnerRef.current = runner

    const groundY  = height + 25
    const ground   = Bodies.rectangle(width / 2, groundY, width * 2, 50, {
      isStatic: true, label: 'ground', render: BODY_STYLES.ground,
      friction: useSimulationStore.getState().groundFriction,
      frictionStatic: useSimulationStore.getState().groundFriction,
    })
    const wallL    = Bodies.rectangle(-25, height / 2, 50, height * 2, {
      isStatic: true, label: 'wall', render: BODY_STYLES.wall, friction: 0.1, frictionStatic: 0.1
    })
    const wallR    = Bodies.rectangle(width + 25, height / 2, 50, height * 2, {
      isStatic: true, label: 'wall', render: BODY_STYLES.wall, friction: 0.1, frictionStatic: 0.1
    })
    Composite.add(engine.world, [ground, wallL, wallR])

    const mouse = Mouse.create(canvasRef.current)
    
    // Fix Matter.js Mouse offset scaling for High DPI screens
    const pr = window.devicePixelRatio || 1
    Mouse.setScale(mouse, { x: 1 / pr, y: 1 / pr })

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse, constraint: { stiffness: 0.18, render: { visible: false } },
    })
    Composite.add(engine.world, mouseConstraint)
    render.mouse = mouse

    mouse.element.removeEventListener('mousewheel', mouse.mousewheel)
    mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel)

    Render.run(render)

    const observer = new ResizeObserver(() => {
      const { width: w, height: h } = containerRef.current.getBoundingClientRect()
      const pr = window.devicePixelRatio || 1
      render.options.width  = w
      render.options.height = h
      render.canvas.width   = w * pr
      render.canvas.height  = h * pr
      render.canvas.style.width  = `${w}px`
      render.canvas.style.height = `${h}px`

      Mouse.setScale(mouse, { x: 1 / pr, y: 1 / pr })

      body_setPos(engine, 'ground', w / 2, h + 25)
      body_setPos(engine, 'wall-r', w + 25, h / 2)
    })
    observer.observe(containerRef.current)

    // Support dragging while paused
    let pausedDragBody = null;
    let pausedDragOffset = { x: 0, y: 0 };
    
    const onMouseDownPaused = (e) => {
      const state = useSimulationStore.getState()
      if (state.runState !== 'paused' && state.runState !== 'idle') return
      if (state.activeTool || state.activeForceTool) return // don't drag if using a tool

      const rect = render.canvas.getBoundingClientRect()
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      
      const bodies = Composite.allBodies(engine.world).filter(b => !b.isStatic)
      const hits = Query.point(bodies, pos)
      if (hits.length > 0) {
        pausedDragBody = hits[0]
        pausedDragOffset = { x: pausedDragBody.position.x - pos.x, y: pausedDragBody.position.y - pos.y }
      }
    }

    const onMouseMovePaused = (e) => {
      const state = useSimulationStore.getState()
      if (!pausedDragBody || (state.runState !== 'paused' && state.runState !== 'idle')) return
      
      const rect = render.canvas.getBoundingClientRect()
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      
      Body.setPosition(pausedDragBody, { 
        x: pos.x + pausedDragOffset.x, 
        y: pos.y + pausedDragOffset.y 
      })
      Body.setVelocity(pausedDragBody, { x: 0, y: 0 })
      Body.setAngularVelocity(pausedDragBody, 0)
      
      Render.world(render)
    }

    const onMouseUpPaused = () => {
      pausedDragBody = null
    }

    render.canvas.addEventListener('mousedown', onMouseDownPaused)
    window.addEventListener('mousemove', onMouseMovePaused)
    window.addEventListener('mouseup', onMouseUpPaused)

    return () => {
      observer.disconnect()
      render.canvas.removeEventListener('mousedown', onMouseDownPaused)
      window.removeEventListener('mousemove', onMouseMovePaused)
      window.removeEventListener('mouseup', onMouseUpPaused)
      Render.stop(render)
      Runner.stop(runner)
      Engine.clear(engine)
    }
  }, []) // eslint-disable-line

  /* ─────────────────────── RUN STATE ──────────────────────── */
  const prevRunStateRef = useRef(runState)

  useEffect(() => {
    const engine = engineRef.current
    const runner = runnerRef.current
    if (!engine || !runner) return

    if (runState === 'running') {
      engine.timing.timeScale = 1
      Runner.run(runner, engine)

      // Auto-launch collision experiment spheres ONLY if we are starting fresh (from idle)
      if (prevRunStateRef.current === 'idle') {
        const allBodies = Composite.allBodies(engine.world)
        const sphereA = allBodies.find(b => b.label === 'SphereA')
        const sphereB = allBodies.find(b => b.label === 'SphereB')
        if (sphereA && sphereB) {
          const speedA = sphereA._pushSpeed !== undefined ? sphereA._pushSpeed : 8
          const speedB = sphereB._pushSpeed !== undefined ? sphereB._pushSpeed : -6
          Body.setVelocity(sphereA, { x: speedA, y: 0 })
          Body.setVelocity(sphereB, { x: speedB, y: 0 })
        }
      }
    } else if (runState === 'slowmo') {
      engine.timing.timeScale = 0.25
      Runner.run(runner, engine)
    } else if (runState === 'paused') {
      Runner.stop(runner)
    } else if (runState === 'idle') {
      Runner.stop(runner)
      engine.timing.timeScale = 1

      const pendingExp = useSimulationStore.getState().pendingExperiment

      const bodies = Composite.allBodies(engine.world)
      if (pendingExp) {
        bodies.filter((b) => b.label !== 'ground' && b.label !== 'wall' && b.label !== 'mouse').forEach((b) => Composite.remove(engine.world, b))
      } else {
        bodies.filter((b) => !b.isStatic).forEach((b) => Composite.remove(engine.world, b))
      }
      
      const constraints = Composite.allConstraints(engine.world)
      constraints.filter((c) => c.label !== 'Mouse Constraint').forEach((c) => Composite.remove(engine.world, c))
      
      useSimulationStore.getState().setInspectedEntity(null)
      useSimulationStore.getState().setSelectedBody(null)
    }

    prevRunStateRef.current = runState
  }, [runState]) // eslint-disable-line

  /* ─────────────────────── REACTIVE ENVIRONMENT ──────────────────────── */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const g = useSimulationStore.getState().gravityScale
    engine.world.gravity.scale = 0.0012 * g
  }, [useSimulationStore(s => s.gravityScale)])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const friction = useSimulationStore.getState().groundFriction
    
    const ground = Composite.allBodies(engine.world).find(b => b.label === 'ground')
    if (ground) {
      ground.friction = friction
      ground.frictionStatic = friction 
    }
  }, [useSimulationStore(s => s.groundFriction)])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    const handleBeforeUpdate = () => {
      const state = useSimulationStore.getState()
      const { activeForceTool, staticFriction, gravityScale } = state
      
      const allBodies = Composite.allBodies(engine.world).filter(b => !b.isStatic)

      allBodies.forEach(body => {
        let netForceX = 0; let netForceY = 0; let hasAppliedForce = false;

        if (activeForceTool === 'wind') {
          netForceX += 0.001 * body.mass; hasAppliedForce = true;
        }

        if (body.appliedForces && body.appliedForces.length > 0) {
          body.appliedForces.forEach(f => {
            netForceX += f.i * 0.0005; netForceY -= f.j * 0.0005; 
          });
          hasAppliedForce = true;
        }

        if (!hasAppliedForce) return;

        const speed = Vector.magnitude(body.velocity);
        
        if (speed < 0.05) {
          const normalForce = body.mass * (0.0012 * gravityScale); 
          const staticLimit = staticFriction * normalForce;
          const appliedMagnitude = Math.sqrt(netForceX**2 + netForceY**2);
          
          if (appliedMagnitude <= staticLimit) {
            return; 
          }
        }

        if (activeForceTool === 'wind') {
          Body.applyForce(body, body.position, { x: 0.001 * body.mass, y: 0 });
        }

        if (body.appliedForces && body.appliedForces.length > 0) {
          body.appliedForces.forEach(f => {
            const forceVec = { x: f.i * 0.0005, y: -f.j * 0.0005 } 
            const worldPos = Vector.add(body.position, Vector.rotate(f.relativePos, body.angle))
            Body.applyForce(body, worldPos, forceVec)
          })
        }
      })

      // Generic Atwood machine computation for ANY pulley joint
      const allConstraints = Composite.allConstraints(engine.world)
      const allWorldBodies = Composite.allBodies(engine.world)
      const pulleyConstraints = allConstraints.filter(c => c.jointType === 'pulley')
      const g_engine = engine.world.gravity.y * engine.world.gravity.scale

      pulleyConstraints.forEach(c => {
        const massA = c.bodyA
        const massB = c.bodyB
        if (!massA || !massB || massA.isStatic || massB.isStatic) return

        // Find nearest pulley wheel
        const wheels = allWorldBodies.filter(b => b.label === 'pulleyWheel' || b.label === 'PulleyWheel')
        if (wheels.length === 0) return
        
        let pulleyCenter = wheels[0]
        let minDist = Infinity
        wheels.forEach(w => {
           const dx = (massA.position.x + massB.position.x)/2 - w.position.x
           const dy = (massA.position.y + massB.position.y)/2 - w.position.y
           const d = dx*dx + dy*dy
           if (d < minDist) { minDist = d; pulleyCenter = w }
        })

        const topY = pulleyCenter.position.y + 35
        const xA = pulleyCenter.position.x - 30
        const xB = pulleyCenter.position.x + 30

        // ── Step 1: Cancel engine gravity completely ──
        Body.applyForce(massA, massA.position, { x: 0, y: -massA.mass * g_engine })
        Body.applyForce(massB, massB.position, { x: 0, y: -massB.mass * g_engine })
        massA.frictionAir = 0
        massB.frictionAir = 0

        // ── Step 2: Prevent collision resolver from interfering ──
        // Use a unique negative group so these bodies don't collide with anything
        const pulleyGroup = -999
        massA.collisionFilter = { group: pulleyGroup, category: 0x0002, mask: 0 }
        massB.collisionFilter = { group: pulleyGroup, category: 0x0002, mask: 0 }

        // ── Step 3: Initialize tracking on first frame ──
        if (c._pulleyVel === undefined) {
          c._pulleyVel = 0
          c._displacement = 0
          c._initYA = massA.position.y
          c._initYB = massB.position.y
        }

        // ── Step 4: Compute Atwood acceleration ──
        // a > 0 means massB is heavier → B falls down, A rises up
        const a_sys = g_engine * (massB.mass - massA.mass) / (massA.mass + massB.mass)

        // ── Step 5: Accumulate velocity and displacement ──
        c._pulleyVel += a_sys
        c._displacement += c._pulleyVel

        // ── Step 6: Directly set positions (bypass engine entirely) ──
        // A moves UP by displacement, B moves DOWN by displacement
        let newYA = c._initYA - c._displacement
        let newYB = c._initYB + c._displacement

        // Clamp: neither block can go above the pulley
        if (newYA < topY) {
          newYA = topY
          c._pulleyVel = 0
        }
        if (newYB < topY) {
          newYB = topY
          c._pulleyVel = 0
        }

        Body.setPosition(massA, { x: xA, y: newYA })
        Body.setPosition(massB, { x: xB, y: newYB })

        // ── Step 7: Zero out velocity so engine cannot move them ──
        Body.setVelocity(massA, { x: 0, y: 0 })
        Body.setVelocity(massB, { x: 0, y: 0 })
      })
    }

    const handleCollisionStart = (event) => {
      const pairs = event.pairs;
      for (let i = 0; i < pairs.length; i++) {
        const { bodyA, bodyB } = pairs[i];
        if (
          (bodyA.label === 'SphereA' && bodyB.label === 'SphereB') ||
          (bodyA.label === 'SphereB' && bodyB.label === 'SphereA')
        ) {
          const sphereA = bodyA.label === 'SphereA' ? bodyA : bodyB;
          const sphereB = bodyA.label === 'SphereB' ? bodyA : bodyB;
          
          if (sphereA.customCollisionType === 'inelastic' && !sphereA._welded) {
            sphereA._welded = true;
            sphereB._welded = true;
            
            // Calculate perfectly inelastic final velocity (momentum conservation)
            const totalMass = sphereA.mass + sphereB.mass;
            const newVx = ((sphereA.mass * sphereA.velocity.x) + (sphereB.mass * sphereB.velocity.x)) / totalMass;
            const newVy = ((sphereA.mass * sphereA.velocity.y) + (sphereB.mass * sphereB.velocity.y)) / totalMass;
            
            Body.setVelocity(sphereA, { x: newVx, y: newVy });
            Body.setVelocity(sphereB, { x: newVx, y: newVy });

            // Create a constraint to weld them together
            const weld = Constraint.create({
              bodyA: sphereA,
              bodyB: sphereB,
              length: Vector.magnitude(Vector.sub(sphereA.position, sphereB.position)),
              stiffness: 1,
              render: { visible: false }
            });
            Composite.add(engine.world, weld);
          }
        }
      }
    };

    Events.on(engine, 'beforeUpdate', handleBeforeUpdate)
    Events.on(engine, 'collisionStart', handleCollisionStart)
    
    // Custom drawing overlay for specific experiments
    const handleAfterRender = () => {
      const render = renderRef.current
      if (!render) return
      const context = render.context
      const allBodies = Composite.allBodies(engine.world)

      context.lineWidth = 2
      
      allBodies.forEach(body => {
        // Draw velocity arrow for carts
        if (body.label.startsWith('Cart') && Vector.magnitude(body.velocity) > 0.5) {
          const vx = body.velocity.x * 5
          const vy = body.velocity.y * 5
          context.beginPath()
          context.moveTo(body.position.x, body.position.y)
          context.lineTo(body.position.x + vx, body.position.y + vy)
          context.strokeStyle = '#2ff5ff'
          context.stroke()
        }
        
        // Draw force decomposer for sliding blocks on incline
        if (body.label === 'Slider') {
          // Gravity arrow (always straight down)
          context.save()
          context.beginPath()
          context.moveTo(body.position.x, body.position.y)
          context.lineTo(body.position.x, body.position.y + 50)
          context.strokeStyle = '#f87171'
          context.lineWidth = 2
          context.stroke()
          // Label
          context.font = "bold 10px 'Inter', sans-serif"
          context.fillStyle = '#f87171'
          context.textAlign = 'left'
          context.fillText('mg', body.position.x + 5, body.position.y + 55)
          context.restore()

          // Speed readout
          context.save()
          const spd = Vector.magnitude(body.velocity)
          context.font = "bold 11px 'Inter', sans-serif"
          context.fillStyle = '#a855f7'
          context.textAlign = 'center'
          context.fillText(`v = ${spd.toFixed(2)} m/s`, body.position.x, body.position.y - 40)
          context.restore()
        }
      })

      // Draw Pendulum: rope from beam center to bob + pivot dot + angle arc
      const pendulumBeam = allBodies.find(b => b.label === 'PendulumBeam')
      const pendulumBob = allBodies.find(b => b.label === 'PendulumBob')
      if (pendulumBeam && pendulumBob) {
        const pivotX = pendulumBeam.position.x
        const pivotY = pendulumBeam.position.y

        // Draw the rope (string line)
        context.save()
        context.beginPath()
        context.moveTo(pivotX, pivotY)
        context.lineTo(pendulumBob.position.x, pendulumBob.position.y)
        context.strokeStyle = '#d4d4d8'
        context.lineWidth = 2
        context.stroke()

        // Draw pivot dot on the beam
        context.beginPath()
        context.arc(pivotX, pivotY, 5, 0, Math.PI * 2)
        context.fillStyle = '#fbbf24'
        context.fill()
        context.strokeStyle = '#f59e0b'
        context.lineWidth = 1.5
        context.stroke()

        // Calculate angle from vertical
        const dx = pendulumBob.position.x - pivotX
        const dy = pendulumBob.position.y - pivotY
        const ropeLen = Math.sqrt(dx * dx + dy * dy)
        const theta = Math.atan2(dx, dy) // angle from vertical (positive = right)

        // Draw vertical reference line (dashed)
        context.beginPath()
        context.setLineDash([4, 4])
        context.moveTo(pivotX, pivotY)
        context.lineTo(pivotX, pivotY + Math.min(80, ropeLen * 0.4))
        context.strokeStyle = 'rgba(255,255,255,0.15)'
        context.lineWidth = 1
        context.stroke()
        context.setLineDash([])

        // Draw angle arc
        if (Math.abs(theta) > 0.02) {
          const arcRadius = Math.min(45, ropeLen * 0.25)
          context.beginPath()
          context.arc(pivotX, pivotY, arcRadius, Math.PI / 2, Math.PI / 2 - theta, theta > 0)
          context.strokeStyle = 'rgba(47, 245, 255, 0.5)'
          context.lineWidth = 2
          context.stroke()

          // Angle label
          context.font = "bold 12px 'Inter', sans-serif"
          context.fillStyle = '#2ff5ff'
          context.textAlign = 'center'
          const labelX = pivotX + (theta > 0 ? 60 : -60)
          context.fillText(`θ = ${(theta * 180 / Math.PI).toFixed(1)}°`, labelX, pivotY + 35)
        }

        // Period readout: T = 2π√(L/g)
        const gScale = 0.0012 * (useSimulationStore.getState().gravityScale || 1)
        const period = 2 * Math.PI * Math.sqrt(ropeLen / (gScale * 1000))
        context.font = "10px 'Inter', sans-serif"
        context.fillStyle = 'rgba(255,255,255,0.4)'
        context.textAlign = 'center'
        context.fillText(`T ≈ ${period.toFixed(2)}s  |  L = ${Math.round(ropeLen)}px`, pivotX, pivotY - 30)

        context.restore()
      }

      // Draw Pulley mass labels
      const hangA = allBodies.find(b => b.label === 'HangingMassA')
      const hangB = allBodies.find(b => b.label === 'HangingMassB')
      if (hangA && hangB) {
        context.save()
        context.font = "bold 11px 'Inter', sans-serif"
        context.textAlign = 'center'
        context.fillStyle = '#e0f2fe'
        context.fillText(`m₁ = ${hangA.mass.toFixed(1)}`, hangA.position.x, hangA.position.y + 40)
        context.fillStyle = '#ffedd5'
        context.fillText(`m₂ = ${hangB.mass.toFixed(1)}`, hangB.position.x, hangB.position.y + 40)
        context.restore()
      }

      const drawArrow = (pos, vel, color, scale) => {
        const mag = Math.sqrt(vel.x ** 2 + vel.y ** 2)
        if (mag < 0.3) return
        const len = Math.min(mag * scale, 90)
        const angle = Math.atan2(vel.y, vel.x)
        const ex = pos.x + Math.cos(angle) * len
        const ey = pos.y + Math.sin(angle) * len

        context.save()
        context.strokeStyle = color
        context.fillStyle = color
        context.lineWidth = 2.5
        context.globalAlpha = 0.85
        context.beginPath()
        context.moveTo(pos.x, pos.y)
        context.lineTo(ex, ey)
        context.stroke()

        context.translate(ex, ey)
        context.rotate(angle)
        context.beginPath()
        context.moveTo(0, 0)
        context.lineTo(-10, -5)
        context.lineTo(-10, 5)
        context.closePath()
        context.fill()
        context.restore()
      }

      // Draw Pulley Rope dynamically for all pulleys
      const pulleyConstraints = Composite.allConstraints(engine.world).filter(c => c.jointType === 'pulley')
      pulleyConstraints.forEach(c => {
        const massA = c.bodyA
        const massB = c.bodyB
        if (!massA || !massB) return

        const wheels = allBodies.filter(b => b.label === 'pulleyWheel' || b.label === 'PulleyWheel')
        if (wheels.length === 0) return
        
        let pulleyCenter = wheels[0]
        let minDist = Infinity
        wheels.forEach(w => {
           const dx = (massA.position.x + massB.position.x)/2 - w.position.x
           const dy = (massA.position.y + massB.position.y)/2 - w.position.y
           const d = dx*dx + dy*dy
           if (d < minDist) { minDist = d; pulleyCenter = w }
        })

        const pulleyR = 30
        const leftX = pulleyCenter.position.x - pulleyR
        const rightX = pulleyCenter.position.x + pulleyR
        const pulleyY = pulleyCenter.position.y

        context.beginPath()
        // Left rope: from massA center straight up to pulley left edge
        context.moveTo(massA.position.x, massA.position.y)
        context.lineTo(leftX, pulleyY)
        // Arc over the pulley wheel (left to right)
        context.arc(pulleyCenter.position.x, pulleyY, pulleyR, Math.PI, 0)
        // Right rope: from pulley right edge straight down to massB center
        context.lineTo(massB.position.x, massB.position.y)
        context.strokeStyle = '#d4d4d8'
        context.lineWidth = 2
        context.stroke()

        // --- Calculate and draw forces ---
        const gScale = useSimulationStore.getState().gravityScale || 1
        const g = 9.81 * gScale
        // a_sys > 0 means B is heavier → B accelerates down, A accelerates up
        const a_sys = g * (massB.mass - massA.mass) / (massA.mass + massB.mass)
        const T = (2 * massA.mass * massB.mass * g) / (massA.mass + massB.mass)

        // Individual net accelerations (magnitude is same, direction differs)
        // For A: net force = T - mA*g → accel_A = (T - mA*g)/mA = T/mA - g
        // For B: net force = mB*g - T → accel_B = g - T/mB
        const accelA = T / massA.mass - g   // negative means upward
        const accelB = g - T / massB.mass   // positive means downward
        
        // Draw Gravity (Red) - always points DOWN
        drawArrow(massA.position, { x: 0, y: massA.mass * g }, '#f87171', 0.5)
        drawArrow(massB.position, { x: 0, y: massB.mass * g }, '#f87171', 0.5)
        
        // Draw Tension (Green) - always points UP
        drawArrow(massA.position, { x: 0, y: -T }, '#4ade80', 0.5)
        drawArrow(massB.position, { x: 0, y: -T }, '#4ade80', 0.5)

        // Draw individual Acceleration arrows (Yellow)
        // A accelerates UP if lighter (accelA < 0), B accelerates DOWN if heavier (accelB > 0)
        if (Math.abs(a_sys) > 0.01) {
          drawArrow({ x: massA.position.x - 35, y: massA.position.y }, { x: 0, y: accelA * 3 }, '#fbbf24', 1)
          drawArrow({ x: massB.position.x + 35, y: massB.position.y }, { x: 0, y: accelB * 3 }, '#fbbf24', 1)
        }

        // Labels
        context.save()
        context.font = "bold 11px 'Inter', sans-serif"
        context.textAlign = 'center'
        
        // Tension label at the top
        context.fillStyle = '#4ade80'
        context.fillText(`T = ${T.toFixed(1)} N`, pulleyCenter.position.x, pulleyCenter.position.y - 45)
        
        // Individual acceleration labels with direction
        context.font = "10px 'Inter', sans-serif"
        context.fillStyle = '#fbbf24'
        if (Math.abs(a_sys) > 0.01) {
          const dirA = accelA < 0 ? '↑' : '↓'
          const dirB = accelB > 0 ? '↓' : '↑'
          context.fillText(`a = ${Math.abs(accelA).toFixed(2)} m/s² ${dirA}`, massA.position.x - 55, massA.position.y + 25)
          context.fillText(`a = ${Math.abs(accelB).toFixed(2)} m/s² ${dirB}`, massB.position.x + 55, massB.position.y + 25)
        } else {
          context.fillText(`a = 0 (balanced)`, massA.position.x - 55, massA.position.y + 25)
          context.fillText(`a = 0 (balanced)`, massB.position.x + 55, massB.position.y + 25)
        }
        context.restore()
      })

      // Draw Collision Lab specifics
      const sphereA = allBodies.find(b => b.label === 'SphereA')
      const sphereB = allBodies.find(b => b.label === 'SphereB')
      if (sphereA && sphereB) {
        // Draw center line
        context.save()
        context.setLineDash([6, 6])
        context.strokeStyle = 'rgba(255,255,255,0.12)'
        context.lineWidth = 1
        const w = render.options.width
        const h = render.options.height
        context.beginPath()
        context.moveTo(w / 2, 0)
        context.lineTo(w / 2, h)
        context.stroke()
        context.restore()

        drawArrow(sphereA.position, sphereA.velocity, '#38bdf8', 12)
        drawArrow(sphereB.position, sphereB.velocity, '#f97316', 12)

        const drawLabel = (body, color, r) => {
          context.save()
          context.font = "bold 13px 'Space Grotesk', monospace"
          context.fillStyle = color
          context.textAlign = "center"
          context.fillText(`m=${body.mass.toFixed(1)}kg`, body.position.x, body.position.y - r - 10)
          const v = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2)
          context.fillText(`v=${v.toFixed(2)} m/s`, body.position.x, body.position.y + r + 18)
          context.restore()
        }

        drawLabel(sphereA, '#e0f2fe', sphereA.circleRadius || 29)
        drawLabel(sphereB, '#ffedd5', sphereB.circleRadius || 35)
      }

      // Draw Inclined Plane / Slider specifics
      const slider = allBodies.find(b => b.label === 'Slider')
      const ramp = allBodies.find(b => b.label === 'Ramp')
      if (slider && ramp) {
        context.save()
        const theta = Math.atan2(200, 400) // Ramp slope
        const cx = slider.position.x
        const cy = slider.position.y
        
        // Draw Weight (mg) straight down
        context.beginPath()
        context.moveTo(cx, cy)
        context.lineTo(cx, cy + 60)
        context.strokeStyle = '#f87171' // red
        context.lineWidth = 2
        context.stroke()
        drawArrow({x: cx, y: cy}, {x: 0, y: 1}, '#f87171', 60)
        
        // Draw Normal Force (N) perpendicular up
        const nx = -Math.sin(theta) * 50
        const ny = -Math.cos(theta) * 50
        context.beginPath()
        context.moveTo(cx, cy)
        context.lineTo(cx + nx, cy + ny)
        context.strokeStyle = '#fbbf24' // yellow
        context.lineWidth = 2
        context.stroke()
        drawArrow({x: cx, y: cy}, {x: nx, y: ny}, '#fbbf24', 1)
        
        // Draw Gravity parallel component (mg sin θ)
        const px = -Math.cos(theta) * 40
        const py = Math.sin(theta) * 40
        context.beginPath()
        context.moveTo(cx, cy)
        context.lineTo(cx + px, cy + py)
        context.strokeStyle = '#f87171'
        context.setLineDash([4, 4])
        context.stroke()
        drawArrow({x: cx, y: cy}, {x: px, y: py}, '#f87171', 1)
        
        // Draw velocity / acceleration direction
        if (Vector.magnitude(slider.velocity) > 0.1) {
           drawArrow(slider.position, slider.velocity, '#4ade80', 10)
        }

        // Labels
        context.setLineDash([])
        context.font = "bold 11px 'Space Grotesk'"
        context.fillStyle = '#f87171'
        context.fillText('mg', cx - 15, cy + 65)
        context.fillStyle = '#fbbf24'
        context.fillText('N', cx + nx + 5, cy + ny - 5)
        context.fillStyle = '#4ade80'
        context.fillText('v / a', cx + px + 10, cy + py + 15)

        context.restore()
      }
    }
    
    // Force pulley positions AFTER all physics + collision resolution
    const handleAfterUpdate = () => {
      const allConstraints = Composite.allConstraints(engine.world)
      const allWorldBodies = Composite.allBodies(engine.world)
      const pulleyConstraints = allConstraints.filter(c => c.jointType === 'pulley')

      pulleyConstraints.forEach(c => {
        const massA = c.bodyA
        const massB = c.bodyB
        if (!massA || !massB || massA.isStatic || massB.isStatic) return
        if (c._displacement === undefined) return // not initialized yet

        const wheels = allWorldBodies.filter(b => b.label === 'pulleyWheel' || b.label === 'PulleyWheel')
        if (wheels.length === 0) return
        
        let pulleyCenter = wheels[0]
        let minDist = Infinity
        wheels.forEach(w => {
           const dx = (massA.position.x + massB.position.x)/2 - w.position.x
           const dy = (massA.position.y + massB.position.y)/2 - w.position.y
           const d = dx*dx + dy*dy
           if (d < minDist) { minDist = d; pulleyCenter = w }
        })

        const topY = pulleyCenter.position.y + 35
        const xA = pulleyCenter.position.x - 30
        const xB = pulleyCenter.position.x + 30

        let newYA = c._initYA - c._displacement
        let newYB = c._initYB + c._displacement
        if (newYA < topY) newYA = topY
        if (newYB < topY) newYB = topY

        Body.setPosition(massA, { x: xA, y: newYA })
        Body.setPosition(massB, { x: xB, y: newYB })
        Body.setVelocity(massA, { x: 0, y: 0 })
        Body.setVelocity(massB, { x: 0, y: 0 })
      })
    }

    Events.on(renderRef.current, 'afterRender', handleAfterRender)
    Events.on(engine, 'afterUpdate', handleAfterUpdate)

    return () => {
      Events.off(engine, 'beforeUpdate', handleBeforeUpdate)
      Events.off(engine, 'collisionStart', handleCollisionStart)
      Events.off(engine, 'afterUpdate', handleAfterUpdate)
      if (renderRef.current) Events.off(renderRef.current, 'afterRender', handleAfterRender)
    }
  }, [])

  /* ─────────────────────── ADD BODY API ──────────────────────── */
  const addBody = useCallback((type, x, y) => {
    const engine = engineRef.current
    if (!engine) return

    let body
    if (type === 'block') {
      body = Bodies.rectangle(x, y, 58, 58, {
        restitution: 0.4, friction: 1.0, frictionStatic: 1.0, label: 'block',
        render: BODY_STYLES.block, initialSize: 58, customScale: 1
      })
    } else if (type === 'sphere') {
      body = Bodies.circle(x, y, 29, {
        restitution: 0.65, friction: 1.0, frictionStatic: 1.0, label: 'sphere',
        render: BODY_STYLES.sphere, initialSize: 58, customScale: 1
      })
    } else if (type === 'pentagon') {
      body = Bodies.polygon(x, y, 5, 30, {
        restitution: 0.38, friction: 1.0, frictionStatic: 1.0, label: 'pentagon',
        render: BODY_STYLES.pentagon, initialSize: 60, customScale: 1
      })
    } else if (type === 'wedge') {
      const vertices = [{ x: 0, y: 0 }, { x: 60, y: 60 }, { x: 0, y: 60 }]
      body = Bodies.fromVertices(x, y, [vertices], {
        restitution: 0.2, friction: 1.0, frictionStatic: 1.0, label: 'wedge',
        render: BODY_STYLES.wedge, initialSize: 60, customScale: 1
      })
    } else if (type === 'roof') {
      body = Bodies.rectangle(x, y, 400, 40, {
        isStatic: true, label: 'roof', render: BODY_STYLES.ground, initialSize: 400, customScale: 1
      })
    } else if (type === 'anchor') {
      // Small static circle used as a fixed pivot point (e.g. pendulum)
      body = Bodies.circle(x, y, 8, {
        isStatic: true, label: 'anchor',
        render: { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 2 },
        initialSize: 16, customScale: 1
      })
    } else if (type === 'cannon') {
      body = Bodies.rectangle(x, y, 100, 30, {
        isStatic: true, label: 'cannon',
        render: { fillStyle: '#FF4949', strokeStyle: '#000000', lineWidth: 4 },
        initialSize: 100, customScale: 1
      })
    } else if (type === 'track') {
      body = Bodies.rectangle(x, y, 800, 20, {
        isStatic: true, label: 'track', render: BODY_STYLES.ground, initialSize: 800, customScale: 1
      })
    } else if (type === 'cart') {
      body = Bodies.rectangle(x, y, 80, 40, {
        restitution: 1.0, friction: 0.05, frictionStatic: 0.05, label: 'cart',
        render: BODY_STYLES.block, initialSize: 80, customScale: 1
      })
    } else if (type === 'wall') {
      body = Bodies.rectangle(x, y, 20, 200, {
        isStatic: true, label: 'wall',
        render: { fillStyle: '#EAEAEA', strokeStyle: '#000000', lineWidth: 4 },
        initialSize: 200, customScale: 1
      })
    } else if (type === 'floor') {
      body = Bodies.rectangle(x, y, 900, 20, {
        isStatic: true, label: 'floor', render: BODY_STYLES.ground, initialSize: 900, customScale: 1
      })
    } else if (type === 'pulleyWheel') {
      body = Bodies.circle(x, y, 30, {
        isStatic: true, label: 'pulleyWheel',
        render: { fillStyle: '#FFFFFF', strokeStyle: '#000000', lineWidth: 4 },
        initialSize: 60, customScale: 1
      })
    } else if (type === 'ramp') {
      // Large inclined plane triangle (400px base, 200px height)
      const vertices = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: -200 }]
      body = Bodies.fromVertices(x, y, [vertices], {
        isStatic: true, label: 'ramp', friction: 0.5, frictionStatic: 0.6,
        render: { fillStyle: '#FFC82C', strokeStyle: '#000000', lineWidth: 4 },
        initialSize: 400, customScale: 1
      })
    } else if (type === 'hangingMass') {
      // Visible hanging mass for pulley — distinct from generic block
      body = Bodies.rectangle(x, y, 50, 50, {
        restitution: 0.1, friction: 0.3, frictionStatic: 0.5, label: 'hangingMass',
        render: { fillStyle: '#13CE66', strokeStyle: '#000000', lineWidth: 4 },
        initialSize: 50, customScale: 1
      })
    }
    if (body) {
      body.bodyType = type
      body.appliedForces = []
      Composite.add(engine.world, body)
    }
    return body
  }, [])

  /* ─────────────────────── INTERACTION API ─────────────────────── */
  const queryEntityAt = useCallback((x, y) => {
    const engine = engineRef.current
    if (!engine) return null
    const bodies = Composite.allBodies(engine.world).filter(b => b.label !== 'ground' && b.label !== 'wall' && b.label !== 'mouse')
    const hits = Query.point(bodies, { x, y })
    if (hits.length > 0) return { type: 'body', entity: hits[0] }

    const constraints = Composite.allConstraints(engine.world).filter(c => c.label !== 'Mouse Constraint' && c.render?.visible !== false)
    for (const c of constraints) {
      const p1 = c.bodyA ? Vector.add(c.bodyA.position, c.pointA || {x:0, y:0}) : c.pointA
      const p2 = c.bodyB ? Vector.add(c.bodyB.position, c.pointB || {x:0, y:0}) : c.pointB
      if (!p1 || !p2) continue

      const l2 = Vector.magnitudeSquared(Vector.sub(p2, p1))
      let dist = 0
      if (l2 === 0) {
        dist = Vector.magnitude(Vector.sub({x, y}, p1))
      } else {
        let t = ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / l2
        t = Math.max(0, Math.min(1, t))
        const proj = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) }
        dist = Vector.magnitude(Vector.sub({x, y}, proj))
      }

      if (dist < 15) return { type: 'constraint', entity: c }
    }
    return null
  }, [])

  const addLock = useCallback((type, body, x, y) => {
    const engine = engineRef.current
    if (!engine || !body) return

    if (type === 'freeze') {
      Body.setStatic(body, true)
    } else if (type === 'pin') {
      const pin = Constraint.create({
        pointA: { x, y }, bodyB: body, pointB: { x: x - body.position.x, y: y - body.position.y },
        stiffness: 1, length: 0, render: { strokeStyle: '#000000', lineWidth: 4, type: 'pin' }
      })
      pin.jointType = type
      Composite.add(engine.world, pin)
    } else if (type === 'axis-y') {
      const rail = Constraint.create({
        pointA: { x, y: body.position.y }, bodyB: body, pointB: { x: x - body.position.x, y: 0 },
        stiffness: 0.8, length: 0, render: { strokeStyle: '#000000', lineWidth: 4, type: 'line' }
      })
      rail.jointType = type
      Composite.add(engine.world, rail)
    } else if (type === 'axis-x') {
      const rail = Constraint.create({
        pointA: { x: body.position.x, y }, bodyB: body, pointB: { x: 0, y: y - body.position.y },
        stiffness: 0.8, length: 0, render: { strokeStyle: '#000000', lineWidth: 4, type: 'line' }
      })
      rail.jointType = type
      Composite.add(engine.world, rail)
    }
  }, [])

  const addJoint = useCallback((type, bodyA, offsetA, posB, bodyB, offsetB) => {
    const engine = engineRef.current
    if (!engine || !bodyA) return

    // FIX: If user clicks near an existing joint line in the air, the query might return 
    // a constraint instead of a body. We must ensure bodyB is an actual physics Body.
    const validBodyB = (bodyB && bodyB.position && bodyB.mass) ? bodyB : null;

    // FIX: Prevent self-connection if they double click the same body
    const finalBodyB = (validBodyB && validBodyB.id === bodyA.id) ? null : validBodyB;
    
    // Explicitly use undefined for Matter.js engine instead of null if targeting the background
    const bB = finalBodyB || undefined; 
    const ptB = !finalBodyB ? posB : (offsetB || { x: 0, y: 0 });

    let constraint
    if (type === 'spring') {
      constraint = Constraint.create({
        bodyA, pointA: offsetA || { x: 0, y: 0 },
        bodyB: bB, pointB: ptB,
        stiffness: 0.05,
        render: { strokeStyle: '#000000', lineWidth: 4, type: 'spring' }
      })
    } else if (type === 'hinge') {
      constraint = Constraint.create({
        bodyA, pointA: offsetA || { x: 0, y: 0 },
        bodyB: bB, pointB: ptB,
        stiffness: 1, length: 0,
        render: { strokeStyle: '#000000', lineWidth: 4 }
      })
    } else if (type === 'pulley' || type === 'slider') {
      constraint = Constraint.create({
        bodyA, pointA: offsetA || { x: 0, y: 0 },
        bodyB: bB, pointB: ptB,
        stiffness: type === 'pulley' ? 0 : 0.2,
        render: { strokeStyle: '#000000', lineWidth: 4, type: 'line', visible: type !== 'pulley' }
      })
    } else if (type === 'rope') {
      // Stiff rope: auto-calculates distance between the two bodies as the natural length
      const pA = bodyA.position
      const pB = bB ? bB.position : posB
      const dx = pB.x - pA.x
      const dy = pB.y - pA.y
      const ropeLength = Math.sqrt(dx * dx + dy * dy)
      constraint = Constraint.create({
        bodyA, pointA: offsetA || { x: 0, y: 0 },
        bodyB: bB, pointB: offsetB || { x: 0, y: 0 },
        stiffness: 0.9,
        length: ropeLength,
        render: { visible: false } // we draw the rope ourselves in afterRender
      })
    }

    if (constraint) {
      constraint.jointType = type
      Composite.add(engine.world, constraint)

      // For pulley joints, immediately snap both bodies under the pulley wheel
      if (type === 'pulley' && bodyA && finalBodyB) {
        const allBodies = Composite.allBodies(engine.world)
        const wheels = allBodies.filter(b => b.label === 'pulleyWheel' || b.label === 'PulleyWheel')
        if (wheels.length > 0) {
          let pulley = wheels[0]
          let minDist = Infinity
          wheels.forEach(w => {
            const dx = (bodyA.position.x + finalBodyB.position.x) / 2 - w.position.x
            const dy = (bodyA.position.y + finalBodyB.position.y) / 2 - w.position.y
            const d = dx * dx + dy * dy
            if (d < minDist) { minDist = d; pulley = w }
          })
          Body.setPosition(bodyA, { x: pulley.position.x - 30, y: bodyA.position.y })
          Body.setPosition(finalBodyB, { x: pulley.position.x + 30, y: finalBodyB.position.y })
        }
      }
      
      // GUARANTEE the store selection is wiped clean immediately after the joint is made,
      // so the next click doesn't accidentally attach to the old body.
      useSimulationStore.getState().setSelectedBody(null)
    }
  }, [])

  const removeEntity = useCallback((type, entity) => {
    const engine = engineRef.current
    if (!engine || !entity) return
    if (type === 'body') {
      const constraints = Composite.allConstraints(engine.world).filter(
        (c) => c.bodyA === entity || c.bodyB === entity
      )
      Composite.remove(engine.world, constraints)
      Composite.remove(engine.world, entity)
    } else if (type === 'constraint') {
      Composite.remove(engine.world, entity)
    }
  }, [])

  /* ─────────────────────── INTERACTIVE FORCES ────────────────────── */
  const applyImpulse = useCallback((body, force) => {
    if (!body) return
    Body.applyForce(body, body.position, force)
  }, [])

  const applyExplosion = useCallback((point, radius = 300, power = 0.5) => {
    const engine = engineRef.current
    if (!engine) return

    const bodies = Matter.Composite.allBodies(engine.world).filter(b => !b.isStatic)
    bodies.forEach(body => {
      const distV = Matter.Vector.sub(body.position, point)
      const dist  = Matter.Vector.magnitude(distV)
      
      if (dist < radius && dist > 0) {
        const magnitude = (1 - dist / radius) * power * body.mass
        const force = Matter.Vector.mult(Matter.Vector.normalise(distV), magnitude)
        Matter.Body.applyForce(body, body.position, force)
      }
    })
  }, [])

  useEffect(() => {
    const engine = engineRef.current
    const render = renderRef.current
    if (!render || !engine) return

    const handleAfterRender = () => {
      const { inspectedEntity } = useSimulationStore.getState()
      const ctx = render.context
      const allBodies = Matter.Composite.allBodies(engine.world).filter(b => !b.isStatic)

      allBodies.forEach(body => {
        if (!body.appliedForces || body.appliedForces.length === 0) return

        let netFx = 0; let netFy = 0
        body.appliedForces.forEach(f => {
          const worldPos = Matter.Vector.add(body.position, Matter.Vector.rotate(f.relativePos, body.angle))
          const forceVec = { x: f.i, y: -f.j }
          netFx += forceVec.x; netFy += forceVec.y

          const endPos = Matter.Vector.add(worldPos, Matter.Vector.mult(forceVec, 2))
          drawArrow(ctx, worldPos, endPos, '#fbbf24')
        })

        const mag = Math.sqrt(netFx*netFx + netFy*netFy)
        if (mag > 0.1) {
          const accel = (mag / body.mass) * 10 
          ctx.font = 'bold 10px Inter, system-ui'
          ctx.fillStyle = '#fbbf24'
          ctx.textAlign = 'center'
          ctx.fillText(`a: ${accel.toFixed(2)} m/s²`, body.position.x, body.position.y - body.initialSize/2 - 15)
        }
      })

      if (!inspectedEntity?.entity) return
      
      ctx.beginPath()

      if (inspectedEntity.type === 'body') {
        const body = inspectedEntity.entity
        const parts = body.parts.length > 1 ? body.parts.slice(1) : body.parts
        for (const part of parts) {
          ctx.moveTo(part.vertices[0].x, part.vertices[0].y)
          for (let j = 1; j < part.vertices.length; j++) {
            ctx.lineTo(part.vertices[j].x, part.vertices[j].y)
          }
          ctx.lineTo(part.vertices[0].x, part.vertices[0].y)
        }
      } else if (inspectedEntity.type === 'constraint') {
        const c = inspectedEntity.entity
        const p1 = c.bodyA ? Matter.Vector.add(c.bodyA.position, c.pointA || {x:0, y:0}) : c.pointA
        const p2 = c.bodyB ? Matter.Vector.add(c.bodyB.position, c.pointB || {x:0, y:0}) : c.pointB
        if (p1 && p2) {
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
        }
      }

      ctx.lineWidth = 3
      ctx.strokeStyle = '#2ff5ff'
      ctx.shadowBlur = 10
      ctx.shadowColor = '#2ff5ff'
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    Matter.Events.on(render, 'afterRender', handleAfterRender)
    return () => {
      Matter.Events.off(render, 'afterRender', handleAfterRender)
    }
  }, [])

  const clearBodyForces = useCallback((body) => {
    if (body) body.appliedForces = []
  }, [])

  const getSnapshot = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return null
    
    const bodies = Matter.Composite.allBodies(engine.world)
      .filter(b => b.label !== 'ground' && b.label !== 'wall' && b.label !== 'mouse')
      .map(b => ({
        type: b.bodyType || (b.label === 'sphere' ? 'sphere' : (b.label === 'roof' ? 'roof' : 'block')),
        x: b.position.x,
        y: b.position.y,
        angle: b.angle,
        velocity: { ...b.velocity },
        angularVelocity: b.angularVelocity,
        label: b.label,
        customScale: b.customScale,
        initialSize: b.initialSize,
        props: {
          mass: b.mass,
          friction: b.friction,
          frictionStatic: b.frictionStatic,
          frictionAir: b.frictionAir,
          restitution: b.restitution,
          customDensity: b.customDensity
        },
        appliedForces: b.appliedForces ? JSON.parse(JSON.stringify(b.appliedForces)) : []
      }))

    const constraints = Matter.Composite.allConstraints(engine.world)
      .filter(c => c.label !== 'Mouse Constraint')
      .map(c => ({
        type: c.jointType || (c.label === 'rope' ? 'rope' : (c.label === 'spring' ? 'spring' : 'hinge')),
        bodyIdA: c.bodyA?.id,
        bodyIdB: c.bodyB?.id,
        pointA: { ...c.pointA },
        pointB: { ...c.pointB },
        stiffness: c.stiffness,
        length: c.length,
        label: c.label
      }))

    return { bodies, constraints }
  }, [])

  const loadSnapshot = useCallback((snapshot) => {
    if (!snapshot) return
    const engine = engineRef.current
    if (!engine) return
    
    // Clear current world except boundaries
    Matter.Composite.allBodies(engine.world)
      .filter(b => b.label !== 'ground' && b.label !== 'wall' && b.label !== 'mouse')
      .forEach(b => Matter.Composite.remove(engine.world, b))
    Matter.Composite.allConstraints(engine.world)
      .filter(c => c.label !== 'Mouse Constraint')
      .forEach(c => Matter.Composite.remove(engine.world, c))
    
    if (snapshot.bodies) {
      snapshot.bodies.forEach(b => {
        const bodyInst = addBody(b.type, b.x, b.y)
        if (bodyInst) {
          bodyInst.label = b.label
          bodyInst.initialSize = b.initialSize
          bodyInst.customScale = b.customScale
          bodyInst.appliedForces = b.appliedForces || []
          
          Matter.Body.setAngle(bodyInst, b.angle || (b.props && b.props.angle) || 0)
          Matter.Body.setVelocity(bodyInst, b.velocity || { x: 0, y: 0 })
          Matter.Body.setAngularVelocity(bodyInst, b.angularVelocity || 0)
          
          if (b.props) {
            Matter.Body.setMass(bodyInst, b.props.mass)
            bodyInst.friction = b.props.friction
            bodyInst.frictionStatic = b.props.frictionStatic
            bodyInst.frictionAir = b.props.frictionAir
            bodyInst.restitution = b.props.restitution
            bodyInst.customDensity = b.props.customDensity
          }
        }
      })
    }
  }, [addBody])

  const clearWorld = useCallback((includeBoundaries = false) => {
    const engine = engineRef.current
    if (!engine) return
    
    Matter.Composite.allBodies(engine.world)
      .filter(b => {
        if (includeBoundaries) return true
        return b.label !== 'ground' && b.label !== 'wall' && b.label !== 'mouse'
      })
      .forEach(b => Matter.Composite.remove(engine.world, b))
      
    Matter.Composite.allConstraints(engine.world)
      .filter(c => c.label !== 'Mouse Constraint')
      .forEach(c => Matter.Composite.remove(engine.world, c))
  }, [])

  return { 
    engineRef, renderRef, addBody, addJoint, 
    queryEntityAt, addLock, removeEntity,
    getSnapshot, loadSnapshot, clearWorld,
    applyImpulse, applyExplosion,
    clearBodyForces
  }
}

function drawArrow(ctx, from, to, color) {
  const headlen = 10
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 6), to.y - headlen * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 6), to.y - headlen * Math.sin(angle + Math.PI / 6))
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function body_setPos(engine, label, x, y) {
  const bodies = Matter.Composite.allBodies(engine.world)
  const b = bodies.find((b) => b.label === label)
  if (b) Matter.Body.setPosition(b, { x, y })
}