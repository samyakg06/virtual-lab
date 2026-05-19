import { useState, useRef } from 'react'
import useSimulationStore from '../store/simulationStore'

const PRIMARY_ACTIONS = [
  { id: 'run',     icon: 'play_arrow',  label: 'Run',     targetState: 'running', filled: true  },
  { id: 'pause',   icon: 'pause',       label: 'Pause',   targetState: 'paused',  filled: true  },
  { id: 'reset',   icon: 'restart_alt', label: 'Reset',   targetState: 'idle',    filled: false },
  { id: 'slowmo',  icon: 'speed',       label: 'Slow-mo', targetState: 'slowmo',  filled: false },
]

const SECONDARY_ACTIONS = [
  { id: 'export',  icon: 'ios_share',   label: 'Export'  },
  { id: 'capture', icon: 'photo_camera',label: 'Capture' },
]

export default function BottomBar() {
  const { runState, setRunState, activeExperimentConfig, setPendingExperiment } = useSimulationStore()

  const [position, setPosition] = useState({ x: 0, y: 80 });
  const dragRef = useRef(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    isDragging.current = true;
    startPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    if (dragRef.current) {
      dragRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    setPosition({
      x: e.clientX - startPos.current.x,
      y: e.clientY - startPos.current.y
    });
  };

  const handlePointerUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragRef.current) {
      dragRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const handleAction = (action) => {
    if (action.id === 'reset') {
      setRunState('idle')
      // If inside a library experiment, re-queue it so it reloads from the template
      if (activeExperimentConfig) {
        setPendingExperiment({ ...activeExperimentConfig })
      } else {
        // In Local Canvas, reset clears all user-placed objects
        const state = useSimulationStore.getState()
        if (state.clearWorldFn) state.clearWorldFn()
        state.setActiveTool(null)
      }
    } else if (action.id === 'run' && runState === 'running') {
      setRunState('paused')
    } else if (action.id === 'pause') {
      setRunState('paused')
    } else {
      setRunState(action.targetState)
    }
  }

  // Derive the visible primary actions: show Run OR Pause depending on state
  const visiblePrimary = PRIMARY_ACTIONS.filter(
    (a) => !(a.id === 'pause' && runState !== 'running')
           && !(a.id === 'run'   && runState === 'running')
  )

  return (
    <footer 
      className="fixed z-40 pointer-events-none flex justify-center transition-none"
      style={{
        top: 0,
        left: '50%',
        transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
      }}
    >
      <div className="pointer-events-auto bg-white rounded-none pl-2 pr-8 py-3 shadow-brutal flex items-center gap-6 border-4 border-black relative">

        {/* ── Drag Handle ── */}
        <div 
          ref={dragRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 flex items-center justify-center transition-colors border-2 border-transparent hover:border-gray-200 rounded"
          title="Drag toolbar"
        >
          <span className="material-symbols-outlined text-gray-500">drag_indicator</span>
        </div>

        <div className="flex items-center gap-10">
          {/* ── Primary actions ── */}
          {visiblePrimary.map((action) => {
          const isActive =
            (action.id === 'run'    && runState === 'running') ||
            (action.id === 'pause'  && runState === 'paused')  ||
            (action.id === 'slowmo' && runState === 'slowmo')  ||
            (action.id === 'reset'  && runState === 'idle')

          return (
            <button
              key={action.id}
              id={`bottombar-${action.id}`}
              onClick={() => handleAction(action)}
              className={`flex flex-col items-center gap-1 group transition-all duration-200 active:scale-90 ${
                isActive ? 'bottom-btn-active' : 'bottom-btn'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={
                  action.filled && isActive
                    ? { fontVariationSettings: "'FILL' 1" }
                    : {}
                }
              >
                {action.icon}
              </span>
              <span className="font-headline text-[9px] uppercase font-bold tracking-widest">
                {action.label}
              </span>
            </button>
          )
        })}

        {/* ── Divider ── */}
        <div className="h-8 w-1 bg-black" />

        {/* ── Secondary actions ── */}
        {SECONDARY_ACTIONS.map((action) => (
          <button
            key={action.id}
            id={`bottombar-${action.id}`}
            className="bottom-btn flex flex-col items-center gap-1 group transition-all duration-200 active:scale-90"
          >
            <span className="material-symbols-outlined text-[22px]">
              {action.icon}
            </span>
            <span className="font-headline text-[9px] uppercase font-bold tracking-widest">
              {action.label}
            </span>
          </button>
        ))}

        </div>

        {/* ── Run state indicator pill ── */}
        {runState !== 'idle' && (
          <div
            className={`absolute -bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-none text-[9px] font-bold font-label uppercase tracking-widest border-2 border-black flex items-center gap-1.5 shadow-button ${
              runState === 'running'
                ? 'bg-primary text-black'
                : runState === 'slowmo'
                ? 'bg-secondary text-black'
                : 'bg-tertiary text-black'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {runState === 'running' ? 'Simulation Running'
              : runState === 'slowmo' ? 'Slow Motion'
              : 'Paused'}
          </div>
        )}
      </div>
    </footer>
  )
}
