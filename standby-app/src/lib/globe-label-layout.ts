// Matches COBE 2's marker projection (sphere radius .8 + marker elevation .02).
// Keeping this math local avoids per-frame DOM measurements and CSS anchors.
export function projectAirport(location: [number, number], phi: number, theta: number, scale: number, size: number) {
  const latitude = location[0] * Math.PI / 180
  const longitude = location[1] * Math.PI / 180 - Math.PI
  const x = -Math.cos(latitude) * Math.cos(longitude) * .82
  const y = Math.sin(latitude) * .82
  const z = Math.cos(latitude) * Math.sin(longitude) * .82
  const viewX = Math.cos(phi) * x + Math.sin(phi) * z
  const viewY = Math.sin(phi) * Math.sin(theta) * x + Math.cos(theta) * y - Math.cos(phi) * Math.sin(theta) * z
  const depth = -Math.sin(phi) * Math.cos(theta) * x + Math.sin(theta) * y + Math.cos(phi) * Math.cos(theta) * z
  return { x: (viewX * scale + 1) * size / 2, y: (-viewY * scale + 1) * size / 2,
    visible: depth >= 0 || viewX * viewX + viewY * viewY >= .64 }
}

export type LabelPoint = { id: string; x: number; y: number; visible: boolean }
export type PlacedLabel = { id: string; x: number; y: number; anchorX: number; anchorY: number; slot: number }
export const LABEL_WIDTH = 48
export const LABEL_HEIGHT = 24

export function placeAirportLabels(points: LabelPoint[], size: number, previous: Map<string, number> = new Map()): PlacedLabel[] {
  const labels: PlacedLabel[] = []
  const padding = 6, gap = 6, width = LABEL_WIDTH, height = LABEL_HEIGHT
  if (size < width + padding * 2) return labels
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  const offsets: [number, number][] = []
  for (let ring = 1; ring <= 4; ring++) {
    offsets.push([-width / 2, -(height + 10) * ring], [10 * ring, -height / 2],
      [-width - 10 * ring, -height / 2], [-width / 2, 10 * ring],
      [10 * ring, -height - 10 * ring], [-width - 10 * ring, -height - 10 * ring],
      [10 * ring, 10 * ring], [-width - 10 * ring, 10 * ring])
  }
  for (const point of points) {
    if (!point.visible || point.x < 0 || point.x > size || point.y < 0 || point.y > size) continue
    const candidates = offsets.map(([dx, dy], slot) => ({
      id: point.id, x: clamp(point.x + dx, padding, size - width - padding),
      y: clamp(point.y + dy, padding, size - height - padding), anchorX: point.x, anchorY: point.y, slot,
    }))
    const preferred = previous.get(point.id)
    if (preferred != null && preferred >= 0 && preferred < candidates.length) candidates.unshift(candidates[preferred])
    const free = (candidate: PlacedLabel) => !labels.some(other => candidate.x < other.x + width + gap && candidate.x + width + gap > other.x && candidate.y < other.y + height + gap && candidate.y + height + gap > other.y)
    let placed = candidates.find(free)
    // Avoid building/sorting a fallback grid in normal animation frames.
    if (!placed) {
      const fallback: PlacedLabel[] = []
      for (let y = padding; y <= size - height - padding; y += height + gap)
        for (let x = padding; x <= size - width - padding; x += width + gap)
          fallback.push({ id: point.id, x, y, anchorX: point.x, anchorY: point.y, slot: -1 })
      fallback.sort((a, b) => Math.hypot(a.x + width / 2 - point.x, a.y + height / 2 - point.y) - Math.hypot(b.x + width / 2 - point.x, b.y + height / 2 - point.y))
      placed = fallback.find(free)
    }
    if (placed) labels.push(placed)
  }
  return labels
}
