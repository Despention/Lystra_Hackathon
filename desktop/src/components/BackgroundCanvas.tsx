import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useSettingsStore } from '../store/settingsStore'

const DOT_SPACING = 30
const BASE_RADIUS = 1.2
const GLOW_RADIUS = 220
const DELAY = 0.08

export default function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  const storeTheme = useSettingsStore((s) => s.theme)
  // Resolve actual light/dark for canvas colors
  const systemDark = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true
  const isLight = storeTheme === 'light' || (storeTheme === 'system' && !systemDark)

  const GLOW_COLOR  = isLight ? '21, 101, 192'   : '162, 201, 255'
  const BASE_COLOR  = isLight ? '13, 17, 23'      : '255, 255, 255'
  const BASE_OPACITY = isLight ? 0.09 : 0.07

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let dots: { x: number; y: number }[] = []
    let glow = { x: -9999, y: -9999 }
    let raf = 0
    let alive = true

    const fit = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      buildDots()
      if (!isHomePage) renderStatic()
    }

    const buildDots = () => {
      dots = []
      for (let x = 0; x < canvas.width; x += DOT_SPACING)
        for (let y = 0; y < canvas.height; y += DOT_SPACING)
          dots.push({ x, y })
    }

    const renderStatic = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const d of dots) {
        ctx.beginPath()
        ctx.arc(d.x, d.y, BASE_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${BASE_COLOR}, ${BASE_OPACITY})`
        ctx.fill()
      }
    }

    const tick = () => {
      if (!alive) return
      const { x: mx, y: my } = mouseRef.current
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      glow.x += (mx - glow.x) * DELAY
      glow.y += (my - glow.y) * DELAY

      for (const d of dots) {
        const dx = glow.x - d.x
        const dy = glow.y - d.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        let opacity = BASE_OPACITY
        let size = BASE_RADIUS
        let color = BASE_COLOR

        if (dist < GLOW_RADIUS) {
          const t = 1 - dist / GLOW_RADIUS
          opacity = BASE_OPACITY + t * (isLight ? 0.6 : 0.87)
          size = BASE_RADIUS + t * 1.8
          color = GLOW_COLOR
        }

        ctx.beginPath()
        ctx.arc(d.x, d.y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color}, ${opacity})`
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    const onLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 }
    }

    window.addEventListener('resize', fit)
    if (isHomePage) {
      document.addEventListener('mousemove', onMove)
      document.documentElement.addEventListener('mouseleave', onLeave)
    }

    fit()
    if (isHomePage) tick()
    else renderStatic()

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fit)
      document.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [isHomePage, isLight, BASE_COLOR, GLOW_COLOR, BASE_OPACITY])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  )
}
