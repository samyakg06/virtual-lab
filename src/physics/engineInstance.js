/**
 * Singleton accessor for the Matter.js engine instance.
 * Avoids storing a mutable ref in Zustand (which is designed for reactive state).
 * usePhysicsEngine registers the engine here; AnalyticsPanel reads from it.
 */
let _engine = null

export const registerEngine = (engine) => { _engine = engine }
export const getEngine      = ()         => _engine
