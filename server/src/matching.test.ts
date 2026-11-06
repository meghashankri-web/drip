import { describe, expect, it } from 'vitest'
import { normalizeTag, scoreCandidate } from './matching.js'

const me = { experienceTags: ['Python'], interestTags: ['Product Management', 'Fundraising', 'Leadership', 'Negotiation', 'Public Speaking'] }

describe('scoreCandidate', () => {
  it('same ZIP beats a far ZIP when the tags are equal', () => {
    const them = { experienceTags: ['Fundraising'], interestTags: [] }
    expect(scoreCandidate(me, them, 0).total).toBeGreaterThan(scoreCandidate(me, them, 2500).total)
  })

  it('a rank-1 interest match beats a rank-5 match', () => {
    const rank1 = scoreCandidate(me, { experienceTags: ['Product Management'], interestTags: [] }, 10)
    const rank5 = scoreCandidate(me, { experienceTags: ['Public Speaking'], interestTags: [] }, 10)
    expect(rank1.total).toBeGreaterThan(rank5.total)
    expect(rank1.matchedInterests).toEqual(['Product Management'])
  })

  it('no overlap gives the lowest score', () => {
    const none = scoreCandidate(me, { experienceTags: ['Pottery'], interestTags: ['Knitting'] }, 2500)
    const some = scoreCandidate(me, { experienceTags: ['Pottery'], interestTags: ['Python'] }, 2500)
    const best = scoreCandidate(me, { experienceTags: ['Leadership'], interestTags: [] }, 2500)
    expect(none.experience + none.shared).toBe(0)
    expect(none.total).toBeLessThan(some.total)
    expect(none.total).toBeLessThan(best.total)
  })

  it('proximity carries the most weight per signal', () => {
    const near = scoreCandidate(me, { experienceTags: [], interestTags: [] }, 0)
    expect(near.proximity).toBe(50)
    expect(near.proximity).toBeGreaterThan(30) // a rank-1 interest match is worth 30
  })

  it('matches ignore case and simple synonyms', () => {
    const viaSynonym = scoreCandidate(me, { experienceTags: ['PM'], interestTags: [] }, 10)
    expect(viaSynonym.matchedInterests).toEqual(['Product Management'])
    expect(normalizeTag('  Machine   LEARNING ')).toBe('machine learning')
    expect(normalizeTag('AI')).toBe('machine learning')
  })
})
