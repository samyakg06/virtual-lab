import { useState, useEffect, useRef, useCallback } from 'react'

/* ── Animated particle background ── */
function ParticleCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // particles
    const COUNT = 60
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.5 + 0.15,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // connections
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 160) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(47, 245, 255, ${0.08 * (1 - dist / 160)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      // dots
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(47, 245, 255, ${p.alpha})`
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}

/* ── Floating physics shape decorations ── */
function FloatingShapes() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Top-right orbit ring */}
      <div className="absolute -top-20 -right-20 w-[340px] h-[340px] rounded-full border border-primary/10 animate-spin-slow" />
      <div className="absolute -top-10 -right-10 w-[260px] h-[260px] rounded-full border border-primary/5 animate-spin-reverse" />

      {/* Bottom-left glow blob */}
      <div
        className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full animate-pulse-soft"
        style={{
          background: 'radial-gradient(circle, rgba(47,245,255,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Mid-right accent */}
      <div
        className="absolute top-1/2 -right-16 w-[200px] h-[200px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,213,203,0.04) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}

/* ── Feature orb item ── */
const FEATURE_COLORS = [
  { glow: 'rgba(47, 245, 255, 0.15)', ring: 'rgba(47, 245, 255, 0.25)', text: '#2ff5ff' },   // cyan
  { glow: 'rgba(253, 212, 0, 0.12)',  ring: 'rgba(253, 212, 0, 0.22)',  text: '#fdd400' },   // gold
  { glow: 'rgba(255, 175, 155, 0.12)', ring: 'rgba(255, 175, 155, 0.22)', text: '#ffaf9b' }, // coral
  { glow: 'rgba(130, 220, 255, 0.12)', ring: 'rgba(130, 220, 255, 0.22)', text: '#82dcff' }, // sky
]

function FeatureOrb({ icon, title, desc, delay, colorIdx }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const c = FEATURE_COLORS[colorIdx]

  return (
    <div
      className={`
        group flex flex-col items-center text-center
        transition-all duration-700 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
      `}
    >
      {/* Glowing orb */}
      <div className="relative mb-5">
        {/* Pulse ring */}
        <div
          className="absolute inset-0 rounded-full animate-pulse-soft scale-150"
          style={{ background: `radial-gradient(circle, ${c.glow}, transparent 70%)` }}
        />
        {/* Icon circle */}
        <div
          className="
            relative w-16 h-16 rounded-full
            flex items-center justify-center
            backdrop-blur-sm
            transition-transform duration-300 group-hover:scale-110
          "
          style={{
            background: `radial-gradient(circle at 30% 30%, ${c.glow}, rgba(19,19,19,0.8))`,
            boxShadow: `0 0 20px ${c.glow}, inset 0 0 12px ${c.glow}`,
            border: `1px solid ${c.ring}`,
          }}
        >
          <span
            className="material-symbols-outlined text-[28px]"
            style={{ color: c.text }}
          >
            {icon}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3
        className="font-headline text-base font-semibold mb-1.5 transition-colors duration-300"
        style={{ color: c.text }}
      >
        {title}
      </h3>

      {/* Description */}
      <p className="text-on-surface-variant/70 text-sm leading-relaxed max-w-[200px]">
        {desc}
      </p>
    </div>
  )
}

/* ── Main Landing Page ── */
export default function LandingPage({ onEnter }) {
  const [heroVisible, setHeroVisible] = useState(false)
  const [taglineVisible, setTaglineVisible] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(false)
  const [featuresVisible, setFeaturesVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setHeroVisible(true), 200)
    const t2 = setTimeout(() => setTaglineVisible(true), 600)
    const t3 = setTimeout(() => setCtaVisible(true), 1000)
    const t4 = setTimeout(() => setFeaturesVisible(true), 1200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  const features = [
    {
      icon: 'science',
      title: 'Real-Time Physics',
      desc: 'Gravity, collisions & energy conservation — simulated live.',
    },
    {
      icon: 'groups',
      title: 'Collaborative',
      desc: 'Shared canvas with live cursors. Build experiments together.',
    },
    {
      icon: 'analytics',
      title: 'Live Analytics',
      desc: 'Interactive energy charts. Validate conservation laws instantly.',
    },
    {
      icon: 'auto_fix_high',
      title: 'Experiment Library',
      desc: 'Pre-built labs — load, tweak, and learn in seconds.',
    },
  ]

  return (
    <div className="relative h-screen w-screen bg-background overflow-y-auto overflow-x-hidden">
      <ParticleCanvas />
      <FloatingShapes />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-6 pt-28 pb-20">

        {/* Logo / Brand */}
        <div
          className={`
            flex items-center gap-3 mb-6
            transition-all duration-700 ease-out
            ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}
          `}
        >
          <span className="material-symbols-outlined text-primary text-[40px]">precision_manufacturing</span>
          <span className="font-headline text-3xl font-bold tracking-tight text-on-surface">
            Virtual<span className="text-primary">Lab</span>
          </span>
        </div>

        {/* Hero headline */}
        <h1
          className={`
            font-headline text-center max-w-2xl
            text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight
            transition-all duration-700 ease-out
            ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
          `}
        >
          <span className="text-on-surface">Your </span>
          <span className="text-primary drop-shadow-[0_0_18px_rgba(47,245,255,0.35)]">Physics</span>
          <span className="text-on-surface"> Playground,</span>
          <br />
          <span className="text-on-surface">Reimagined.</span>
        </h1>

        {/* Tagline */}
        <p
          className={`
            mt-5 text-center max-w-lg text-on-surface-variant text-base sm:text-lg leading-relaxed
            transition-all duration-700 ease-out delay-200
            ${taglineVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
          `}
        >
          A collaborative 2D simulation platform where you build machines, test forces,
          and discover real-time physics — all inside your browser.
        </p>

        {/* CTA Button */}
        <div
          className={`
            mt-10 transition-all duration-700 ease-out
            ${ctaVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
          `}
        >
          <button
            id="get-started-btn"
            onClick={onEnter}
            className="
              group relative inline-flex items-center gap-2
              px-8 py-3.5 rounded-full
              bg-primary text-on-primary font-headline font-semibold text-lg
              shadow-[0_0_24px_rgba(47,245,255,0.3),0_0_64px_rgba(47,245,255,0.1)]
              hover:shadow-[0_0_32px_rgba(47,245,255,0.5),0_0_80px_rgba(47,245,255,0.15)]
              hover:scale-105
              active:scale-95
              transition-all duration-300 ease-out
              cursor-pointer
            "
          >
            Get Started
            <span className="material-symbols-outlined text-[22px] group-hover:translate-x-1 transition-transform duration-300">
              arrow_forward
            </span>
          </button>
        </div>

        {/* ── Feature Orbs ── */}
        <div
          className={`
            mt-24 w-full max-w-4xl
            transition-opacity duration-500
            ${featuresVisible ? 'opacity-100' : 'opacity-0'}
          `}
        >
          {/* Thin separator line */}
          <div className="mx-auto mb-14 w-32 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 sm:gap-6">
            {features.map((f, i) => (
              <FeatureOrb key={f.title} {...f} colorIdx={i} delay={1400 + i * 180} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 mb-8 text-center text-on-surface-variant/40 text-xs font-body">
          <p>Built for learners & educators · Powered by Matter.js & React</p>
        </footer>
      </div>
    </div>
  )
}
