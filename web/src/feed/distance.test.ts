import { describe, expect, it } from 'vitest'
import { formatDistance, swipeOutcome } from './distance'

describe('formatDistance', () => {
  it.each([
    [null, null], [0, 'Less than 1 mi away'], [0.5, 'Less than 1 mi away'], [4.63, '4.6 mi away'],
    [12.2, '12 mi away'], [2560.4, '2,560 mi away'],
  ])('%s -> %s', (miles, text) => {
    expect(formatDistance(miles)).toBe(text)
  })
})

describe('swipeOutcome', () => {
  it('needs enough distance, or a fast flick', () => {
    expect(swipeOutcome(130, 0)).toBe('right')
    expect(swipeOutcome(-130, 0)).toBe('left')
    expect(swipeOutcome(60, 0.1)).toBeNull()
    expect(swipeOutcome(60, 1.2)).toBe('right')
    expect(swipeOutcome(-60, -1.2)).toBe('left')
    expect(swipeOutcome(20, 3)).toBeNull()
  })
})
