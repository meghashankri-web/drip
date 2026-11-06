import { cleanTag } from './resume'
import type { ResumeDraft } from '../store/onboarding'

export const INTERESTS_MAX = 5
export const LIMIT_MESSAGE = `You can pick up to ${INTERESTS_MAX} interests. Remove one to add another.`

/** Used if the suggestion request fails entirely (e.g. offline). */
export const FALLBACK_SUGGESTIONS = [
  'Leadership', 'Negotiation', 'Public Speaking', 'Career Transitions', 'Product Management',
  'Fundraising', 'Entrepreneurship', 'Machine Learning', 'Board Service', 'Mentorship',
]

/** Adds an interest at the lowest rank. Returns the new list or an error message. */
export function addInterest(list: string[], raw: string): { list: string[] } | { error: string } {
  if (list.length >= INTERESTS_MAX) return { error: LIMIT_MESSAGE }
  const result = cleanTag(raw, list)
  if ('error' in result) return result
  return { list: [...list, result.tag] }
}

/** Moves the item at `from` to `to` (clamped), returning a new list. */
export function moveInterest(list: string[], from: number, to: number): string[] {
  if (from < 0 || from >= list.length) return list
  const target = Math.max(0, Math.min(list.length - 1, to))
  if (target === from) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(target, 0, item!)
  return next
}

/** Suggestions to show: not already chosen (case-insensitive). */
export function visibleSuggestions(suggestions: string[], chosen: string[]): string[] {
  const taken = new Set(chosen.map((t) => t.toLowerCase()))
  return suggestions.filter((s) => !taken.has(s.toLowerCase()))
}

/** Suggestions depend on her experience and stage; refetch only when those change. */
export function suggestionKey(resume: ResumeDraft): string {
  return JSON.stringify([resume.careerStage, [...resume.experienceTags].sort()])
}
