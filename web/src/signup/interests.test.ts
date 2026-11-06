import { describe, expect, it } from 'vitest'
import { addInterest, INTERESTS_MAX, moveInterest, visibleSuggestions } from './interests'

describe('addInterest', () => {
  it('appends at the lowest rank', () => {
    expect(addInterest(['A'], ' Negotiation ')).toEqual({ list: ['A', 'Negotiation'] })
  })
  it(`refuses a ${INTERESTS_MAX + 1}th interest with a helpful message`, () => {
    const five = ['A', 'B', 'C', 'D', 'E']
    const result = addInterest(five, 'F')
    expect(result).toHaveProperty('error')
    expect('error' in result && result.error).toMatch(/up to 5/)
  })
  it('rejects duplicates regardless of case', () => {
    expect(addInterest(['Leadership'], 'leadership')).toHaveProperty('error')
  })
})

describe('moveInterest', () => {
  const list = ['A', 'B', 'C', 'D']
  it('moves up and down', () => {
    expect(moveInterest(list, 2, 1)).toEqual(['A', 'C', 'B', 'D'])
    expect(moveInterest(list, 0, 1)).toEqual(['B', 'A', 'C', 'D'])
  })
  it('clamps at the ends and ignores bad indexes', () => {
    expect(moveInterest(list, 0, -1)).toBe(list)
    expect(moveInterest(list, 3, 9)).toBe(list)
    expect(moveInterest(list, 7, 0)).toBe(list)
  })
  it('does not mutate the input', () => {
    const copy = [...list]
    moveInterest(list, 3, 0)
    expect(list).toEqual(copy)
  })
})

describe('visibleSuggestions', () => {
  it('hides suggestions already chosen', () => {
    expect(visibleSuggestions(['Leadership', 'SQL', 'Hiring'], ['sql'])).toEqual(['Leadership', 'Hiring'])
  })
})
