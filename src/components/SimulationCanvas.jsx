import { useRef, useCallback, useEffect, useState } from 'react'
import Matter from 'matter-js'
import usePhysicsEngine from '../hooks/usePhysicsEngine'
import { useCollaboration } from '../hooks/useCollaboration'
import CollaboratorCursor from './canvas/CollaboratorCursor'
import useSimulationStore from '../store/simulationStore'
import { getEngine } from '../physics/engineInstance'
import socket from '../services/socket'

/* Assign a colour to a remote user deterministically */
const COLLAB_COLORS = ['primary', 'secondary', 'tertiary']
const getColor = (id) => COLLAB_COLORS[Math.abs(hashCode(id)) % COLLAB_COLORS.length]
function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return h
}

export default function SimulationCanvas({ isShared, roomId, broadcastAction, broadcastCursor }) {
  const containerRef = useRef(null)
  const canvasRef    = useRef(null)

  const {
    runState, setAddBodyFn, setAddJointFn, setRemoveEntityFn, remoteCollaborators, setSocketConnected,
    activeTool, setActiveTool, selectedBody, setSelectedBody, inspectedEntity, setInspectedEntity,
    activePage, localWorkspaceSnapshot, setLocalWorkspaceSnapshot,
    projectWorkspaceSnapshot, setProjectWorkspaceSnapshot,
    setGetSnapshotFn, setLoadSnapshotFn
  } = useSimulationStore()
  
  // FIX: Destructure ALL functions used in this component from usePhysicsEngine
  const {
    getSnapshot, loadSnapshot, clearWorld,
    addBody, addJoint, removeEntity, queryEntityAt,
    addLock, clearBodyForces, applyImpulse, applyExplosion
  } = usePhysicsEngine(canvasRef, containerRef)

  /* ── Tab Persistence (Snapshotting) ── */
  const prevPageRef = useRef(activePage)
  useEffect(() => {
    if (prevPageRef.current === activePage) return

    // Save departing page snapshot
    if (prevPageRef.current === 'local-canvas') {
      const snap = getSnapshot()
      setLocalWorkspaceSnapshot(snap)
    } else if (prevPageRef.current === 'project') {
      const snap = getSnapshot()
      setProjectWorkspaceSnapshot(snap)
    }

    // Load incoming page snapshot
    if (activePage === 'local-canvas') {
      if (localWorkspaceSnapshot) loadSnapshot(localWorkspaceSnapshot)
    } else if (activePage === 'project') {
      if (projectWorkspaceSnapshot) loadSnapshot(projectWorkspaceSnapshot)
    }

    prevPageRef.current = activePage
  }, [activePage, getSnapshot, loadSnapshot, localWorkspaceSnapshot, setLocalWorkspaceSnapshot, projectWorkspaceSnapshot, setProjectWorkspaceSnapshot])

  /* ── Sync Simulation Run State ── */
  const prevRunStateRef = useRef(runState)
  useEffect(() => {
    if (prevRunStateRef.current !== runState) {
      prevRunStateRef.current = runState
      if (broadcastAction) {
        broadcastAction('run-state', { state: runState })
      }
    }
  }, [runState, broadcastAction])

  /* Register addBody/Joint in store so ControlPalette can call spawn() */
  useEffect(() => { 
    setAddBodyFn(addBody) 
    setAddJointFn(addJoint)
    setRemoveEntityFn(removeEntity)
    setGetSnapshotFn(getSnapshot)
    setLoadSnapshotFn(loadSnapshot)
    useSimulationStore.getState().setClearWorldFn(clearWorld)
    
    return () => {
      setAddBodyFn(null)
      setAddJointFn(null)
      setRemoveEntityFn(null)
      setGetSnapshotFn(null)
      setLoadSnapshotFn(null)
      useSimulationStore.getState().setClearWorldFn(null)
    }
  }, [addBody, addJoint, removeEntity, setAddBodyFn, setAddJointFn, setRemoveEntityFn, clearWorld, setGetSnapshotFn, setLoadSnapshotFn, getSnapshot, loadSnapshot])

  /* Read pending experiment from Library load */
  const pendingExperiment = useSimulationStore(state => state.pendingExperiment)
  const setPendingExperiment = useSimulationStore(state => state.setPendingExperiment)
  const loaderFiredRef = useRef(false)
  const lastPendingRef = useRef(null)
  useEffect(() => {
    // Reset the guard whenever a NEW pendingExperiment arrives, 
    // OR if pendingExperiment is cleared, reset so we can reload the same one later.
    if (pendingExperiment) {
      if (pendingExperiment !== lastPendingRef.current) {
        loaderFiredRef.current = false
        lastPendingRef.current = pendingExperiment
      }
    } else {
      lastPendingRef.current = null
      loaderFiredRef.current = false
    }

    if (pendingExperiment && addBody && runState === 'idle') {
      if (loaderFiredRef.current) return
      loaderFiredRef.current = true

      const exp = pendingExperiment
      // Clear immediately to prevent React double-effect firing and cloning the setup
      setPendingExperiment(null)      
      // Clear world of previous experiment objects
      clearWorld()
      
      const w = containerRef.current?.clientWidth || window.innerWidth
      const h = containerRef.current?.clientHeight || window.innerHeight

      // For collision experiment, remove side walls so spheres fly off-screen
      if (exp.customUI === 'collision') {
        const eng = getEngine()
        if (eng) {
          const allBodies = Matter.Composite.allBodies(eng.world)
          allBodies.filter(b => b.label === 'wall').forEach(b => Matter.Composite.remove(eng.world, b))
          
          // Also expand the ground significantly for this experiment so they don't fall off the floor edge
          const ground = allBodies.find(b => b.label === 'ground')
          if (ground) {
            const wideGround = Matter.Bodies.rectangle(0, 0, w * 20, 60);
            Matter.Body.setVertices(ground, wideGround.vertices)
            Matter.Body.setPosition(ground, { x: w/2, y: ground.position.y })
          }
        }
      }
      
      setTimeout(() => {
        const lookup = {}
        // Spawn bodies
        if (exp.bodies) {
          exp.bodies.forEach((b) => {
            const spawnX = (b.x !== undefined ? w * b.x : w * 0.5) + (b.px || 0)
            const spawnY = (b.y !== undefined ? h * b.y : h * 0.5) + (b.py || 0)
            const bodyInst = addBody(b.type, spawnX, spawnY)
            if (bodyInst) {
              if (b.label) bodyInst.label = b.label
              if (b.id) lookup[b.id] = bodyInst
              
              // Initialize inspector metadata if missing
              if (bodyInst.initialSize === undefined) {
                bodyInst.initialSize = (b.props?.radius ? b.props.radius * 2 : 58)
              }
              if (bodyInst.customScale === undefined) bodyInst.customScale = 1
              
              // Apply per-body props from experiment config
              if (b.props) {
                if (b.props.mass) Matter.Body.setMass(bodyInst, b.props.mass)
                if (b.props.radius && bodyInst.circleRadius) {
                  const scaleFactor = b.props.radius / bodyInst.circleRadius
                  Matter.Body.scale(bodyInst, scaleFactor, scaleFactor)
                  // Re-apply mass after scale since scale changes mass
                  if (b.props.mass) Matter.Body.setMass(bodyInst, b.props.mass)
                }
                if (b.props.friction !== undefined) bodyInst.friction = b.props.friction
                if (b.props.frictionStatic !== undefined) bodyInst.frictionStatic = b.props.frictionStatic
                if (b.props.frictionAir !== undefined) bodyInst.frictionAir = b.props.frictionAir
                if (b.props.restitution !== undefined) bodyInst.restitution = b.props.restitution
                if (b.props.angle !== undefined) Matter.Body.setAngle(bodyInst, b.props.angle)
              }
            }
          })
        }
        // Spawn locks
        if (exp.locks && addLock) {
          exp.locks.forEach((lk) => {
            const b = lookup[lk.bodyId]
            if (b) {
              const lockX = (lk.x !== undefined ? w * lk.x : b.position.x) + (lk.px || 0)
              const lockY = (lk.y !== undefined ? h * lk.y : b.position.y) + (lk.py || 0)
              addLock(lk.type, b, lockX, lockY)
            }
          })
        }
        if (exp.joints && addJoint) {
          exp.joints.forEach((jt) => {
            const bA = lookup[jt.bodyIdA]
            const bB = lookup[jt.bodyIdB]
            if (bA) {
              let posB = null
              if (!jt.bodyIdB) {
                const bX = (jt.posB?.x !== undefined ? w * jt.posB.x : w * 0.5) + (jt.posB?.px || 0)
                const bY = (jt.posB?.y !== undefined ? h * jt.posB.y : h * 0.5) + (jt.posB?.py || 0)
                posB = { x: bX, y: bY }
              }
              addJoint(jt.type, bA, jt.offsetA || null, posB, bB || null, jt.offsetB || null)
            }
          })
        }
        // For collision experiment, remove side walls so spheres fly off-screen after collision
        if (exp.customUI === 'collision') {
          const eng = getEngine()
          if (eng) {
            const allBodies = Matter.Composite.allBodies(eng.world)
            allBodies.filter(b => b.label === 'wall').forEach(b => Matter.Composite.remove(eng.world, b))
          }
        }
      }, 50)
    }
  }, [pendingExperiment, addBody, addLock, addJoint, runState, setPendingExperiment, clearWorld])

  const [hoverPoint, setHoverPoint] = useState(null)

  const handleMouseMove = useCallback((e) => {
    // Sync cursor to teammates
    if (broadcastCursor && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        broadcastCursor((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
    }

    if (activeTool?.category === 'joint' && queryEntityAt && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const hit = queryEntityAt(x, y)
      if (hit?.type === 'body') {
        const dx = x - hit.entity.position.x
        const dy = y - hit.entity.position.y
        setHoverPoint({ x: e.clientX, y: e.clientY, dx, dy })
      } else {
        setHoverPoint(null)
      }
    } else if (hoverPoint) {
      setHoverPoint(null)
    }
  }, [broadcastCursor, activeTool, queryEntityAt, hoverPoint])

  /* Track socket connection status */
  useEffect(() => {
    const onConnect    = () => setSocketConnected(true)
    const onDisconnect = () => setSocketConnected(false)
    socket.on('connect',    onConnect)
    socket.on('disconnect', onDisconnect)
    setSocketConnected(socket.connected)
    return () => {
      socket.off('connect',    onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [setSocketConnected])

  /* ── Drag-and-drop from palette ── */
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    const ind = document.getElementById('drop-indicator')
    if (ind) ind.style.borderColor = '#000000'
  }, [])

  const handleDragLeave = useCallback(() => {
    const ind = document.getElementById('drop-indicator')
    if (ind) ind.style.borderColor = 'transparent'
  }, [])
  const spawnBody = useSimulationStore(state => state.spawnBody)

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      const ind = document.getElementById('drop-indicator')
      if (ind) ind.style.borderColor = 'transparent'

      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Add Body (via store so it auto-broadcasts to collaborators)
      const type = e.dataTransfer.getData('body-type')
      if (type && spawnBody) {
        spawnBody(type, x, y)
        return
      }

      // Add Joint (legacy drag/drop support)
      const jointType = e.dataTransfer.getData('joint-type')
      if (jointType && addJoint) {
        // Find nearest body to attach to (fallback)
        addJoint(jointType, null, {x, y}, null)
        return
      }
    },
    [spawnBody, addJoint],
  )
  /* Forces state */
  const activeForceTool = useSimulationStore(state => state.activeForceTool)
  const setActiveForceTool = useSimulationStore(state => state.setActiveForceTool)
  const manualForceVector = useSimulationStore(state => state.manualForceVector)

  /* ── Click-to-Connect Tool Logic ── */
  const handleCanvasClick = useCallback((e) => {
    if (!containerRef.current || !queryEntityAt) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hit = queryEntityAt(x, y) // { type: 'body'|'constraint', entity }

    // Selection Mode (only if absolutely no tools are active)
    if (!activeTool && !activeForceTool) {
      if (hit) {
        setInspectedEntity(hit)
      } else {
        setInspectedEntity(null) // deselect
      }
      return
    }

    if (activeTool) {

    if (activeTool.category === 'lock') {
      if (hit?.type === 'body') {
        if (addLock) addLock(activeTool.type, hit.entity, x, y)
        setActiveTool(null) // clear tool after use
      }
    } else if (activeTool.category === 'joint') {
      let localOffset = hit?.type === 'body' 
        ? { x: x - hit.entity.position.x, y: y - hit.entity.position.y }
        : null

      // For pulleys, always connect to the center of mass (0, 0 offset)
      if (activeTool.type === 'pulley' && hit?.type === 'body') {
        localOffset = { x: 0, y: 0 }
      }

      if (!selectedBody) {
        // Step 1: Select first body
        if (hit?.type === 'body') {
          setSelectedBody({ entity: hit.entity, offset: localOffset })
        }
      } else {
        // Step 2: Link to second body or background
        if (hit?.type === 'body' && hit.entity.id === selectedBody.entity.id) return // same body, ignore
        
        if (addJoint) {
          addJoint(
            activeTool.type, 
            selectedBody.entity, 
            selectedBody.offset, 
            { x, y }, 
            hit?.type === 'body' ? hit.entity : null, 
            localOffset
          )
        }
        // Reset tool state so the user can inspect objects again
        setActiveTool(null)
        setSelectedBody(null)
      }
    }
  }

  // ── Force Tools ──
  if (activeForceTool === 'manual') {
      if (hit?.type === 'body') {
        const relPos = { x: x - hit.entity.position.x, y: y - hit.entity.position.y }
        // Add to persistent forces list
        if (!hit.entity.appliedForces) hit.entity.appliedForces = []
        hit.entity.appliedForces.push({
          id: Date.now(),
          i: manualForceVector.i,
          j: manualForceVector.j,
          relativePos: relPos
        })
      }
    } else if (activeForceTool === 'clear') {
      if (hit?.type === 'body' && clearBodyForces) {
        clearBodyForces(hit.entity)
      }
    }
  }, [activeTool, activeForceTool, manualForceVector, selectedBody, queryEntityAt, addLock, addJoint, clearBodyForces, setActiveTool, setSelectedBody, setInspectedEntity])

  /* ── Run-state hint ── */
  let hint = null
  if (activeTool) {
    if (activeTool.category === 'lock') {
      hint = { text: `LOCK TOOL ACTIVE: Click an object to apply ${activeTool.type.replace('-', ' ')}`, color: 'text-tertiary' }
    } else if (activeTool.category === 'joint') {
      hint = { 
        text: selectedBody ? `JOINT: Click second object or space to attach` : `JOINT TOOL ACTIVE: Click first object to attach ${activeTool.type}`,
        color: 'text-primary'
      }
    }
  } else if (activeForceTool) {
    const forceHints = {
      wind:      { text: 'WIND ACTIVE: Global horizontal current applied to all bodies', color: 'text-amber-400' },
      thrust:    { text: 'THRUST TOOL: Click any object on the canvas to launch it upwards',  color: 'text-amber-400' },
      explosion: { text: 'EXPLOSION TOOL: Click anywhere to create a blast wave',             color: 'text-amber-400' },
    }
    hint = forceHints[activeForceTool]
  } else {
    const hintMap = {
      idle:    { text: 'Drag objects from the panel → drop here  •  Press RUN to simulate', color: 'text-outline' },
      running: null,
      slowmo:  { text: '0.25× Slow Motion active', color: 'text-secondary/60' },
      paused:  { text: 'Paused — Press RUN to continue',           color: 'text-tertiary/60' },
    }
    hint = hintMap[runState]
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${activeTool ? 'cursor-crosshair' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseDown={handleCanvasClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Matter.js canvas ── */}
      <canvas
        ref={canvasRef}
        id="simulation-canvas"
        className="absolute inset-0"
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {/* ── Ground visual line ── */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black pointer-events-none z-10" />

      {/* ── Live remote cursors from socket ── */}
      {/* FIX: Add optional chaining to prevent undefined map crashes */}
      {remoteCollaborators?.map((user) =>
        user.cursor ? (
          <CollaboratorCursor
            key={user.id}
            name={user.name?.toUpperCase() ?? user.id.slice(0, 6).toUpperCase()}
            color={getColor(user.id)}
            x={user.cursor.x}
            y={user.cursor.y}
            icon="near_me"
            action={user.action}
          />
        ) : null,
      )}

      {/* ── Run state hint ── */}
      {hint && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className={`text-[10px] font-label uppercase tracking-widest ${hint.color}`}>
            {hint.text}
          </span>
        </div>
      )}

      {/* ── Drop indicator border ── */}
      <div
        id="drop-indicator"
        className="absolute inset-3 border-4 border-dashed rounded-none pointer-events-none transition-all duration-200 z-10"
        style={{ borderColor: 'transparent' }}
      />

      {/* ── Hover Offset Tooltip ── */}
      {hoverPoint && (() => {
        // Cartesian math standard: Up is positive Y. Canvas standard: Up is negative Y.
        // We flip dy exclusively for display so the user sees a typical Cartesian plane.
        const displayDy = -hoverPoint.dy

        return (
          <div 
            className="fixed z-50 pointer-events-none px-2 py-1 bg-black border-2 border-black rounded-none text-[9px] font-label font-bold text-white tracking-widest uppercase shadow-brutal-sm transition-opacity"
            style={{ left: hoverPoint.x + 15, top: hoverPoint.y + 15 }}
          >
            {hoverPoint.dx > 0 ? '+' : ''}{hoverPoint.dx.toFixed(0)}, {displayDy > 0 ? '+' : ''}{displayDy.toFixed(0)}
          </div>
        )
      })()}
    </div>
  )
}