/**
 * Pre-built physics experiment templates.
 * Custom built for Educational Labs.
 *
 * Coordinate convention:
 *   x, y  — fraction of canvas (0..1)
 *   px, py — pixel offset added after fraction
 */
export const EXPERIMENTS = [
  /* ═══════════════════════════════════════════════════════════
   * 1. SIMPLE PENDULUM
   * A roof beam at the top, a weighted bob hanging from a rope
   * constraint. The bob starts at ~30° from vertical so it
   * swings immediately when the user presses RUN.
   * ═══════════════════════════════════════════════════════════ */
  {
    id: 'exp-pendulum',
    title: 'Simple Pendulum Lab',
    author: 'System',
    authorColor: 'primary',
    category: 'Oscillations',
    difficulty: 'Beginner',
    tags: ['gravity', 'periodic', 'swing'],
    description: 'A classic simple pendulum demonstrating periodic motion, gravitational potential energy, and conservation principles.',
    bodies: [
      { id: 'beam', type: 'roof', x: 0.5, y: 0.15, label: 'PendulumBeam' },
      { id: 'bob', type: 'sphere', x: 0.5, px: -125, y: 0.15, py: 216.5, label: 'PendulumBob', props: { mass: 5, radius: 20, frictionAir: 0.005 } },
    ],
    locks: [
      { type: 'freeze', bodyId: 'beam' }
    ],
    joints: [
      { type: 'rope', bodyIdA: 'beam', bodyIdB: 'bob' }
    ],
    svgPreview: 'pendulum',
    stats: { bodies: 2, joints: 1, runtime: 'Live' },
    customUI: 'pendulum'
  },


  {
    id: 'exp-pulley',
    title: 'Pulley & Weight System',
    author: 'System',
    authorColor: 'tertiary',
    category: 'Mechanics',
    difficulty: 'Intermediate',
    tags: ['tension', 'mass', 'acceleration'],
    description: 'Two hanging masses connected by a rope over a fixed pulley (Atwood machine). Measure tension and acceleration.',
    bodies: [
      { id: 'pulley', type: 'pulleyWheel', x: 0.5, y: 0.2, label: 'PulleyWheel' },
      { id: 'massA',  type: 'hangingMass', x: 0.4, y: 0.5, label: 'HangingMassA', props: { mass: 2 } },
      { id: 'massB',  type: 'hangingMass', x: 0.6, y: 0.5, label: 'HangingMassB', props: { mass: 5 } }
    ],
    locks: [
      { type: 'freeze', bodyId: 'pulley' }
    ],
    joints: [
      { type: 'pulley', bodyIdA: 'massA', bodyIdB: 'massB' }
    ],
    svgPreview: 'pulley',
    stats: { bodies: 3, joints: 1, runtime: 'Live' },
    customUI: 'pulley'
  },

  /* ═══════════════════════════════════════════════════════════
   * 4. COLLISION & MOMENTUM LAB
   * Two spheres on a flat track surface. Forces are applied
   * inward by the "Collide" button. Energy balance is tracked.
   * ═══════════════════════════════════════════════════════════ */
  {
    id: 'exp-collision',
    title: 'Collision & Momentum Lab',
    author: 'System',
    authorColor: 'primary',
    category: 'Collisions',
    difficulty: 'Intermediate',
    tags: ['elastic', 'inelastic', 'momentum'],
    description: 'Two spheres of different mass on the ground surface collide. Observe energy transfer, momentum conservation, and heat loss.',
    bodies: [
      { id: 'sphereA', type: 'sphere', x: 0.25, y: 1.0, py: -22, label: 'SphereA', props: { mass: 3, radius: 22, friction: 0.001, frictionAir: 0.001, restitution: 1.0 } },
      { id: 'sphereB', type: 'sphere', x: 0.75, y: 1.0, py: -35, label: 'SphereB', props: { mass: 8, radius: 35, friction: 0.001, frictionAir: 0.001, restitution: 1.0 } },
    ],
    locks: [],
    joints: [],
    svgPreview: 'collision',
    stats: { bodies: 2, joints: 0, runtime: 'Live' },
    customUI: 'collision'
  },


  /* ═══════════════════════════════════════════════════════════
   * 6. INCLINED PLANE & FRICTION
   * A large static ramp triangle with a block placed near its
   * top. Gravity pulls the block down the slope; friction
   * opposes the motion.
   * ═══════════════════════════════════════════════════════════ */
  {
    id: 'exp-incline',
    title: 'Inclined Plane & Friction',
    author: 'System',
    authorColor: 'tertiary',
    category: 'Mechanics',
    difficulty: 'Advanced',
    tags: ['friction', 'slope', 'normal force'],
    description: 'A large ramp with a sliding block. Explore friction coefficients and force vector decomposition.',
    bodies: [
      { id: 'ramp',   type: 'ramp',  x: 0.5, y: 0.9, label: 'Ramp', props: { isStatic: true, friction: 0.1 } },
      { id: 'slider', type: 'block', x: 0.542, y: 0.6842, label: 'Slider', props: { mass: 5, friction: 0.1, angle: -0.4636 } }
    ],
    locks: [
      { type: 'freeze', bodyId: 'ramp' }
    ],
    joints: [],
    svgPreview: 'incline',
    stats: { bodies: 2, joints: 0, runtime: 'Live' },
    customUI: 'incline'
  }
]

export const CATEGORIES = ['All', ...new Set(EXPERIMENTS.map((e) => e.category))]
export const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced']
