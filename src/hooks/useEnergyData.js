import { useState, useEffect, useRef } from 'react'
import Matter from 'matter-js'
import { getEngine } from '../physics/engineInstance'
import useSimulationStore from '../store/simulationStore'

const MAX_POINTS   = 12   // rolling window size
const SAMPLE_MS    = 300  // sample interval

/* Compute total KE and PE from all dynamic bodies */
function sampleEnergy(engine, canvasH) {
  const bodies = Matter.Composite.allBodies(engine.world).filter((b) => !b.isStatic)
  if (bodies.length === 0) return { ke: 0, pe: 0, bodies }

  let ke = 0
  let pe = 0
  const g = Math.abs(engine.gravity.y * engine.gravity.scale) * 1000 // approximate m/s²

  bodies.forEach((b) => {
    const v2 = b.velocity.x ** 2 + b.velocity.y ** 2
    ke += 0.5 * b.mass * v2
    const h = Math.max(0, (canvasH ?? 600) - b.position.y)
    pe += b.mass * g * h * 0.00001 // scaled to readable units
  })

  return { ke: +ke.toFixed(2), pe: +pe.toFixed(2), bodies }
}

export default function useEnergyData() {
  const { runState } = useSimulationStore()
  const [chartData, setChartData] = useState([])
  const [topBody, setTopBody] = useState(null)
  const tickRef = useRef(null)
  const idxRef  = useRef(0)

  useEffect(() => {
    if (runState === 'idle') {
      setChartData([])
      setTopBody(null)
      return
    }

    if (runState === 'paused') return // freeze chart on pause

    const sample = () => {
      const engine = getEngine()
      if (!engine) return

      const canvasH = document.getElementById('simulation-canvas')?.height ?? 600
      const { ke, pe, bodies } = sampleEnergy(engine, canvasH)

      idxRef.current += 1
      setChartData((prev) => {
        const next = [...prev, { t: idxRef.current, ke, pe }]
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
      })

      // Pick the fastest / heaviest body for diagnostics
      if (bodies.length > 0) {
        const top = bodies.reduce((a, b) => {
          const va = a.velocity.x ** 2 + a.velocity.y ** 2
          const vb = b.velocity.x ** 2 + b.velocity.y ** 2
          return vb > va ? b : a
        })
        setTopBody(top)
      }
    }

    tickRef.current = setInterval(sample, SAMPLE_MS)
    return () => clearInterval(tickRef.current)
  }, [runState])

  return { chartData, topBody }
}
