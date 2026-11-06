/** "0.5 mi away", "12 mi away", "2,560 mi away" — or null when unknown. */
export function formatDistance(miles: number | null): string | null {
  if (miles === null) return null
  if (miles < 1) return 'Less than 1 mi away'
  const rounded = miles < 10 ? Math.round(miles * 10) / 10 : Math.round(miles)
  return `${rounded.toLocaleString('en-US')} mi away`
}

/** Decides what a drag ends as. Thresholds are in px; fast flicks count with less distance. */
export function swipeOutcome(dx: number, velocityPxPerMs: number, threshold = 110): 'left' | 'right' | null {
  const fling = Math.abs(velocityPxPerMs) > 0.6 && Math.abs(dx) > 40
  if (dx >= threshold || (fling && dx > 0)) return 'right'
  if (dx <= -threshold || (fling && dx < 0)) return 'left'
  return null
}
