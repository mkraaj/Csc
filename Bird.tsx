import { useEffect, useRef } from 'react'

/**
 * ScrollBird — a bird that flies across the screen as the user scrolls.
 * Pure rAF + transforms (GPU), no re-renders. Flaps faster when you scroll fast,
 * glides when idle, flips direction with scroll direction, and follows a 3D-feeling
 * sine path with subtle scale/rotation.
 */
export default function Bird() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const birdRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    let raf = 0
    let lastY = window.scrollY
    let vel = 0
    let t = 0
    let facing = 1

    const tick = () => {
      const y = window.scrollY
      const dy = y - lastY
      lastY = y
      vel += (dy - vel) * 0.12
      t += 0.016

      const doc = document.documentElement
      const max = Math.max(1, doc.scrollHeight - window.innerHeight)
      const p = y / max // 0..1 page progress

      // Horizontal flight across the screen with a wave path
      const vw = window.innerWidth
      const x = -120 + p * (vw + 240)
      const baseY = window.innerHeight * 0.28
      const yy = baseY + Math.sin(p * Math.PI * 5 + t * 0.6) * 90 + Math.sin(t * 1.7) * 8
      // bob from scroll velocity
      const lift = Math.max(-60, Math.min(60, -vel * 2.2))
      const rot = Math.max(-30, Math.min(30, vel * 1.6))
      const scale = 0.8 + Math.sin(p * Math.PI * 2) * 0.25 // depth illusion

      if (Math.abs(dy) > 0.5) facing = dy >= 0 ? 1 : -1

      const wrap = wrapRef.current, bird = birdRef.current, inner = innerRef.current
      if (wrap && bird && inner) {
        wrap.style.transform = `translate3d(${x}px, ${yy + lift}px, 0)`
        bird.style.transform = `rotate(${rot}deg) scale(${scale})`
        inner.style.transform = `scaleX(${facing})`
        bird.classList.toggle('bird-glide', Math.abs(vel) < 2)
        wrap.style.opacity = p > 0.002 && p < 0.998 ? '1' : '0'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div ref={wrapRef} className="fixed left-0 top-0 z-[60] pointer-events-none transition-opacity duration-500" style={{ opacity: 0 }} aria-hidden>
      <div ref={birdRef} style={{ transition: 'transform .2s ease-out' }}>
        <div ref={innerRef}>
          <svg width="72" height="56" viewBox="0 0 96 72" fill="none">
            {/* body */}
            <ellipse cx="48" cy="40" rx="20" ry="12" fill="url(#bg1)" />
            {/* head */}
            <circle cx="66" cy="30" r="9" fill="url(#bg1)" />
            <circle cx="69" cy="28" r="1.8" fill="#0b1020" />
            {/* beak */}
            <path d="M74 30 L84 33 L74 36 Z" fill="#fbbf24" />
            {/* tail */}
            <path d="M30 38 L14 30 L20 42 L12 46 L30 46 Z" fill="#6366f1" opacity="0.9" />
            {/* wing (flaps) */}
            <g className="bird-wing">
              <path d="M50 36 C42 14 26 8 12 12 C26 18 34 28 40 40 Z" fill="#38bdf8" />
              <path d="M50 36 C44 20 32 14 22 15 C32 21 38 30 43 40 Z" fill="#818cf8" opacity="0.85" />
            </g>
            <defs>
              <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#a5b4fc" />
                <stop offset="1" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  )
}
