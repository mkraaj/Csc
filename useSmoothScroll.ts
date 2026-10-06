import { useEffect } from 'react'
import Lenis from 'lenis'

/** Buttery-smooth inertial scrolling (desktop); native on touch. */
export function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    })
    let raf = 0
    const loop = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); lenis.destroy() }
  }, [])
}

/** IntersectionObserver-based scroll reveal. Attach to a container ref selector '.reveal'. */
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.12 })
    const els = document.querySelectorAll('.reveal:not(.in)')
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  })
}
