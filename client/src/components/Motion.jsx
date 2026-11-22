import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from '../utils/useMotion'

// Shared animation primitives (previously copy-pasted inside each page).

export function Stagger({ children, delay = 0, className = '' }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s cubic-bezier(.4,0,.2,1), transform 0.5s cubic-bezier(.4,0,.2,1)',
      }}
    >
      {children}
    </div>
  )
}

// Reveals once when scrolled into view. direction: up | down | left | right | none.
const OFFSETS = { up: 'translateY(20px)', down: 'translateY(-20px)', left: 'translateX(24px)', right: 'translateX(-24px)', none: 'none' }

export function Reveal({ children, delay = 0, direction = 'up', className = '' }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const seen = useInView(ref, { once: true, threshold: 0.12 })
  const visible = reduced || seen
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : OFFSETS[direction] || OFFSETS.up,
        transition: reduced ? 'none' : `opacity 0.6s cubic-bezier(.4,0,.2,1) ${delay}ms, transform 0.6s cubic-bezier(.4,0,.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// Counts from 0 to `value` once scrolled into view (rAF, ease-out).
export function CountUp({ value, prefix = '', suffix = '', duration = 1400, className = '' }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const seen = useInView(ref, { once: true, threshold: 0.4 })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!seen || reduced) return undefined
    const start = performance.now()
    let raf
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, reduced, value, duration])
  const shown = reduced ? value : n
  return <span ref={ref} className={`tabular ${className}`}>{prefix}{shown.toLocaleString('en-IN')}{suffix}</span>
}

export function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const start = prev.current
    const end = Number(value) || 0
    const duration = 900
    const startTime = performance.now()
    let raf
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * ease))
      if (progress < 1) raf = requestAnimationFrame(tick)
      else prev.current = end
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span className="tabular-nums">{prefix}{display.toLocaleString('en-IN')}{suffix}</span>
}
