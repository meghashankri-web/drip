/**
 * Feed ranking (Step 9). Pure functions, no database access, so they're easy to unit test.
 *
 * Score = proximity (heaviest) + experience match + shared tags.
 *  - proximity:  up to 50 points, decaying with distance (half at ~17 miles).
 *  - experience: her experience tags that match my interests, weighted by my rank (rank 1 = 30 … rank 5 = 6).
 *  - shared:     3 points per other tag we have in common.
 */

const SYNONYMS: Record<string, string> = {
  pm: 'product management',
  'product manager': 'product management',
  ml: 'machine learning',
  ai: 'machine learning',
  'artificial intelligence': 'machine learning',
  ux: 'ux design',
  'user experience': 'ux design',
  vc: 'venture capital',
  dei: 'diversity & inclusion',
  'd&i': 'diversity & inclusion',
  'fund raising': 'fundraising',
  swe: 'software engineering',
  'software engineer': 'software engineering',
  'data scientist': 'data science',
  startup: 'startups',
  'start ups': 'startups',
  'nonprofit management': 'nonprofit leadership',
  'non-profit leadership': 'nonprofit leadership',
}

/** Case-insensitive, whitespace-tolerant, with simple synonyms ("PM" = "Product Management"). */
export function normalizeTag(tag: string): string {
  const t = tag.toLowerCase().trim().replace(/\s+/g, ' ')
  return SYNONYMS[t] ?? t
}

export interface MatchProfile {
  experienceTags: string[]
  /** In rank order: index 0 is rank 1. */
  interestTags: string[]
}

export interface ScoreBreakdown {
  total: number
  proximity: number
  experience: number
  shared: number
  /** Her experience tags that match my interests (for explaining the match). */
  matchedInterests: string[]
}

export const PROXIMITY_MAX = 50
const PROXIMITY_HALF_MILES = 17

export function proximityScore(miles: number | null): number {
  if (miles === null) return 0
  return PROXIMITY_MAX * Math.pow(0.5, Math.max(0, miles) / PROXIMITY_HALF_MILES)
}

export function scoreCandidate(me: MatchProfile, them: MatchProfile, miles: number | null): ScoreBreakdown {
  const theirExperience = new Set(them.experienceTags.map(normalizeTag))
  const matchedInterests: string[] = []
  let experience = 0
  me.interestTags.forEach((tag, i) => {
    if (theirExperience.has(normalizeTag(tag))) {
      experience += (5 - Math.min(i, 4)) * 6 // rank 1 → 30, rank 5 → 6
      matchedInterests.push(tag)
    }
  })

  const mine = new Set([...me.experienceTags, ...me.interestTags].map(normalizeTag))
  const counted = new Set(matchedInterests.map(normalizeTag))
  const theirs = new Set([...them.experienceTags, ...them.interestTags].map(normalizeTag))
  let shared = 0
  for (const t of theirs) if (mine.has(t) && !counted.has(t)) shared += 3

  const proximity = proximityScore(miles)
  const round = (n: number) => Math.round(n * 10) / 10
  return {
    total: round(proximity + experience + shared),
    proximity: round(proximity),
    experience,
    shared,
    matchedInterests,
  }
}
