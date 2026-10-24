"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import createGlobe from "cobe"
import { projectAirport, placeAirportLabels, LABEL_WIDTH, LABEL_HEIGHT } from "@/lib/globe-label-layout"

export interface CdnMarker { id: string; location: [number, number]; region: string }
export interface CdnArc { id: string; from: [number, number]; to: [number, number] }
export interface GlobeCdnProps {
  markers?: CdnMarker[]
  arcs?: CdnArc[]
  className?: string
  speed?: number
  focusLocation?: [number, number] | null
}

const defaults: CdnMarker[] = [
  { id: "origin", location: [40.71, -74.01], region: "FROM: JFK" },
  { id: "destination", location: [51.47, -0.45], region: "TO: LHR" },
]
const defaultArcs: CdnArc[] = [{ id: "direct", from: defaults[0].location, to: defaults[1].location }]
const pinColors: [number, number, number][] = [[0.02, 0.40, 0.68], [0.76, 0.36, 0.02], [0.45, 0.25, 0.72], [0.04, 0.48, 0.35]]
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
const colorCss = (index: number) => `rgb(${pinColors[index % pinColors.length].map(value => Math.round(value * 255)).join(",")})`


export function GlobeCdn({ markers = defaults, arcs = defaultArcs, className = "", speed = 0.003, focusLocation = null }: GlobeCdnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null)
  const camera = useRef({ phi: 0, theta: 0.2 })
  const zoomRef = useRef(1)
  const spinRef = useRef(true)
  const speedRef = useRef(speed)
  const invalidate = useRef<() => void>(() => {})
  const targetZoom = useRef(1)
  const labelNodes = useRef(new Map<string, HTMLButtonElement>())
  const labelSlots = useRef(new Map<string, number>())
  const labelMarkers = useRef(markers)
  const leaderPath = useRef<SVGPathElement>(null)
  const zoomOutput = useRef<HTMLOutputElement>(null)
  const [unavailable, setUnavailable] = useState(false)
  const focusLat = focusLocation?.[0]
  const focusLon = focusLocation?.[1]
  // Airport labels use the same projection as COBE without expensive CSS anchors.
  const route = useMemo(() => ({
    markers: markers.map((marker, index) => ({ location: marker.location, size: 0.019, color: pinColors[index % pinColors.length] })),
    arcs: arcs.filter(arc => arc.from[0] !== arc.to[0] || arc.from[1] !== arc.to[1]).map(arc => ({ from: arc.from, to: arc.to })),
  }), [markers, arcs])
  const pendingRoute = useRef(route)
  const routeDirty = useRef(true)

  useEffect(() => { pendingRoute.current = route; labelMarkers.current = markers; labelSlots.current.clear(); routeDirty.current = true; invalidate.current() }, [route, markers])
  useEffect(() => { speedRef.current = speed; invalidate.current() }, [speed])
  useEffect(() => {
    if (focusLat != null && focusLon != null) {
      camera.current = { phi: -(focusLon * Math.PI / 180) - Math.PI / 2, theta: clamp(focusLat * Math.PI / 180, -1.35, 1.35) }
      invalidate.current()
    }
  }, [focusLat, focusLon])

  const changeZoom = useCallback((value: number, immediate = false) => {
    targetZoom.current = clamp(value, 1, 3)
    if (immediate) zoomRef.current = targetZoom.current
    invalidate.current()
  }, [])
  const toggleSpin = useCallback(() => {
    spinRef.current = !spinRef.current
    invalidate.current()
  }, [])
  const reset = useCallback(() => {
    camera.current = focusLat != null && focusLon != null
      ? { phi: -(focusLon * Math.PI / 180) - Math.PI / 2, theta: clamp(focusLat * Math.PI / 180, -1.35, 1.35) }
      : { phi: 0, theta: 0.2 }
    labelSlots.current.clear(); changeZoom(1)
  }, [focusLat, focusLon, changeZoom])
  const resetRef = useRef(reset)
  useEffect(() => { resetRef.current = reset }, [reset])

  useEffect(() => {
    const canvas = canvasRef.current
    const viewport = viewportRef.current
    if (!canvas || !viewport) return
    let frame = 0, lastDraw = 0, nextDrawAt = 0, dirty = true, visible = false, width = 0, disposed = false
    let reportedFailure = false
    const pointers = new Map<number, { x: number; y: number }>()
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let pinchDistance = 0
    function schedule() {
      dirty = true
      if (!disposed && visible && !document.hidden && !frame) frame = requestAnimationFrame(draw)
    }
    function draw(now: number) {
      frame = 0
      if (disposed || !visible || document.hidden || !globeRef.current) { lastDraw = 0; return }
      const rotating = spinRef.current && pointers.size === 0
      // Target 60 fps (also on high-refresh displays), with elapsed-time rotation.
      // DOM labels move via transforms; no React state or layout reads per frame.
      const elapsed = lastDraw ? now - lastDraw : 0
      const zooming = Math.abs(targetZoom.current - zoomRef.current) > .001
      if (dirty || now >= nextDrawAt - .5) {
        if (zooming) zoomRef.current += (targetZoom.current - zoomRef.current) * (1 - Math.exp(-Math.max(elapsed, 16) * .025))
        else zoomRef.current = targetZoom.current
        if (rotating && lastDraw) camera.current.phi += speedRef.current * 60 * Math.min(elapsed, 100) / 1000
        globeRef.current.update({ ...camera.current, scale: zoomRef.current,
          ...(routeDirty.current ? pendingRoute.current : {}) })
        routeDirty.current = false
        const points = labelMarkers.current.map(marker => ({ id: marker.id, ...projectAirport(marker.location, camera.current.phi, camera.current.theta, zoomRef.current, width) }))
        const placed = placeAirportLabels(points, width, labelSlots.current)
        const shown = new Set(placed.map(label => label.id))
        labelNodes.current.forEach((node, id) => { node.style.visibility = shown.has(id) ? "visible" : "hidden" })
        const paths: string[] = []
        placed.forEach(label => {
          labelSlots.current.set(label.id, label.slot)
          const node = labelNodes.current.get(label.id)
          if (node) node.style.transform = `translate3d(${label.x}px,${label.y}px,0)`
          const endX = clamp(label.anchorX, label.x, label.x + LABEL_WIDTH)
          const endY = clamp(label.anchorY, label.y, label.y + LABEL_HEIGHT)
          paths.push(`M${label.anchorX},${label.anchorY}L${endX},${endY}`)
        })
        leaderPath.current?.setAttribute("d", paths.join(""))
        const percent = `${Math.round(zoomRef.current * 100)}%`
        if (zoomOutput.current && zoomOutput.current.textContent !== percent) zoomOutput.current.textContent = percent
        if (viewport!.dataset.globeZoom !== zoomRef.current.toFixed(3)) viewport!.dataset.globeZoom = zoomRef.current.toFixed(3)
        lastDraw = now; dirty = false
        // Keep the deadline phase instead of rounding to whole display frames;
        // this also targets 60 fps on 75/120/144 Hz screens.
        nextDrawAt = Math.min(nextDrawAt + 1000 / 60, now + 1000 / 60)
        if (nextDrawAt < now) nextDrawAt = now + 1000 / 60
      }
      if (rotating || Math.abs(targetZoom.current - zoomRef.current) > .001) frame = requestAnimationFrame(draw)
    }
    invalidate.current = schedule
    function resize() {
      if (!visible) return
      const next = Math.round(viewport!.getBoundingClientRect().width)
      if (!next || next === width) return
      width = next
      if (globeRef.current) globeRef.current.update({ width, height: width })
      else {
        try {
          const options = { width, height: width, devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.25),
            phi: camera.current.phi, theta: camera.current.theta, scale: zoomRef.current,
            dark: 0, diffuse: 1.5, mapSamples: 16000, mapBrightness: 10,
            baseColor: [1, 1, 1] as [number, number, number], markerColor: pinColors[0],
            glowColor: [0.94, 0.93, 0.91] as [number, number, number], markerElevation: 0.02,
            ...pendingRoute.current, arcColor: [0.1, 0.4, 0.8] as [number, number, number], arcWidth: 0.8, arcHeight: 0.3, opacity: 0.8 }
          globeRef.current = createGlobe(canvas!, options)
          // COBE returns a no-op renderer when WebGL is unavailable.
          if (!(canvas!.getContext("webgl2") || canvas!.getContext("webgl"))) throw new Error("WebGL unavailable")
          canvas!.style.opacity = "1"
        } catch {
          if (!reportedFailure) { reportedFailure = true; setUnavailable(true) }
          return
        }
      }
      schedule()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(viewport)
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting
      if (visible) { lastDraw = 0; resize(); schedule() }
      else { cancelAnimationFrame(frame); frame = 0; lastDraw = 0 }
    }, { threshold: 0 })
    intersection.observe(viewport)
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastDraw = 0 }
      else schedule()
    }
    const distance = () => {
      const [first, second] = Array.from(pointers.values())
      return second ? Math.hypot(second.x - first.x, second.y - first.y) : 0
    }
    function down(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return
      spinRef.current = false
      canvas!.focus({ preventScroll: true })
      canvas!.setPointerCapture(event.pointerId)
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      pinchDistance = distance()
      canvas!.style.cursor = "grabbing"
    }
    function move(event: PointerEvent) {
      const previous = pointers.get(event.pointerId)
      if (!previous) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size === 2) {
        const nextDistance = distance()
        if (pinchDistance > 0) changeZoom(targetZoom.current * nextDistance / pinchDistance, true)
        pinchDistance = nextDistance
      } else if (pointers.size === 1) {
        camera.current.phi += (event.clientX - previous.x) / (180 * zoomRef.current)
        camera.current.theta = clamp(camera.current.theta + (event.clientY - previous.y) / (240 * zoomRef.current), -1.35, 1.35)
      }
      schedule()
    }
    function up(event: PointerEvent) {
      pointers.delete(event.pointerId); pinchDistance = distance()
      if (!pointers.size) canvas!.style.cursor = "grab"
      schedule()
    }
    function wheel(event: WheelEvent) {
      // Wheel events are captured only over the globe; the rest of the page
      // scrolls normally. Browser/trackpad pinch arrives through the same path.
      event.preventDefault()
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? width : 1)
      changeZoom(targetZoom.current * Math.exp(-clamp(pixels, -120, 120) * .004))
    }

    function resetView() { resetRef.current() }
    function key(event: KeyboardEvent) {
      if (["+", "=", "-", "0", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
        event.preventDefault()
        if (event.key === "+" || event.key === "=") changeZoom(targetZoom.current * 1.25)
        else if (event.key === "-") changeZoom(targetZoom.current / 1.25)
        else if (event.key === "0") resetRef.current()
        else if (event.key === " ") toggleSpin()
        else {
          camera.current.phi += event.key === "ArrowLeft" ? -0.12 : event.key === "ArrowRight" ? 0.12 : 0
          camera.current.theta = clamp(camera.current.theta + (event.key === "ArrowUp" ? -0.12 : event.key === "ArrowDown" ? 0.12 : 0), -1.35, 1.35)
          schedule()
        }
      }
    }
    canvas.addEventListener("pointerdown", down)
    canvas.addEventListener("pointermove", move)
    canvas.addEventListener("pointerup", up)
    canvas.addEventListener("pointercancel", up)
    canvas.addEventListener("lostpointercapture", up)
    viewport.addEventListener("wheel", wheel, { passive: false })
    canvas.addEventListener("dblclick", resetView)
    canvas.addEventListener("keydown", key)
    document.addEventListener("visibilitychange", onVisibility)
    const onMotionPreference = () => {
      if (reducedMotion.matches) spinRef.current = false
      schedule()
    }
    reducedMotion.addEventListener("change", onMotionPreference)
    const initialMotionPreference = requestAnimationFrame(onMotionPreference)
    // Initial drawing is deferred until ResizeObserver reports a usable size.
    return () => {
      disposed = true; cancelAnimationFrame(frame); cancelAnimationFrame(initialMotionPreference); invalidate.current = () => {}
      resizeObserver.disconnect(); intersection.disconnect()
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move)
      canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up)
      canvas.removeEventListener("lostpointercapture", up); viewport.removeEventListener("wheel", wheel); canvas.removeEventListener("dblclick", resetView); canvas.removeEventListener("keydown", key)
      document.removeEventListener("visibilitychange", onVisibility); reducedMotion.removeEventListener("change", onMotionPreference)
      globeRef.current?.destroy(); globeRef.current = null
    }
  }, [changeZoom, toggleSpin])

  return <div className={`select-none ${className}`} data-globe-view>
    <div ref={viewportRef} className="relative aspect-square overflow-hidden rounded-2xl" data-globe-zoom="1">
      <canvas ref={canvasRef} tabIndex={0} aria-label="Interactive flight globe. Scroll to zoom, drag or use arrow keys to rotate. Plus and minus zoom; zero or double-click resets; space pauses rotation."
        className="h-full w-full cursor-grab outline-offset-[-3px] focus-visible:outline-2 focus-visible:outline-sky-700"
        style={{ opacity: 0, touchAction: "none" }} />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true"><path ref={leaderPath} fill="none" stroke="#64748b" strokeWidth="1" strokeOpacity=".65" /></svg>
      <div className="pointer-events-none absolute inset-0" aria-label="Airport labels">
        {markers.map((marker, index) => {
          const code = marker.region.match(/\b[A-Z]{3}\b/g)?.at(-1) || marker.region
          return <button type="button" key={marker.id} ref={node => { if (node) labelNodes.current.set(marker.id, node); else labelNodes.current.delete(marker.id) }}
            data-globe-label={code} aria-label={`Center globe on ${code}`} title={marker.region}
            onClick={() => { camera.current = { phi: -(marker.location[1] * Math.PI / 180) - Math.PI / 2, theta: clamp(marker.location[0] * Math.PI / 180, -1.35, 1.35) }; spinRef.current = false; labelSlots.current.clear(); invalidate.current() }}
            className="pointer-events-auto absolute left-0 top-0 inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white/95 font-mono text-[11px] font-bold text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            style={{ width: LABEL_WIDTH, height: LABEL_HEIGHT, visibility: "hidden", willChange: "transform" }}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorCss(index) }} />{code}
          </button>
        })}
      </div>
      {unavailable && <div className="absolute inset-0 grid place-items-center p-8 text-center text-sm text-slate-600">The 3D globe is unavailable in this browser. Airport routes and flight analysis still work.</div>}
      <output ref={zoomOutput} aria-label="Globe zoom" aria-live="off" className="sr-only">100%</output>
    </div>
    <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">Scroll to zoom · Drag to rotate · <button type="button" onClick={reset} className="underline underline-offset-2 hover:text-sky-800">Reset view</button></p>
  </div>
}
