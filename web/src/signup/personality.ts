import type { PersonalityDraft } from '../store/onboarding'

export const CHATS_MIN = 1
export const CHATS_MAX = 8
export const ANSWER_MAX = 200

export type PersonalityErrors = Partial<Record<keyof PersonalityDraft, string>>

/** Keeps chats-per-month a whole number within 1–8 (e.g. if stored data was edited). */
export function clampChats(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : CHATS_MIN
  return Math.min(CHATS_MAX, Math.max(CHATS_MIN, v))
}

export function validatePersonality(p: PersonalityDraft): PersonalityErrors {
  const e: PersonalityErrors = {}
  const text = (field: 'hobbies' | 'bestAdvice' | 'womanAdmired' | 'askMeAbout', label: string) => {
    const v = p[field].trim()
    if (!v) e[field] = `Please share ${label}`
    else if (v.length > ANSWER_MAX) e[field] = `Keep it under ${ANSWER_MAX} characters`
  }
  text('hobbies', 'a few hobbies or interests')
  text('bestAdvice', 'a piece of advice')
  text('womanAdmired', 'someone you look up to')
  text('askMeAbout', 'something people can ask you about')
  if (!p.meetingPref) e.meetingPref = 'Choose how you like to meet'
  if (p.chatsPerMonth !== clampChats(p.chatsPerMonth)) e.chatsPerMonth = `Choose ${CHATS_MIN}–${CHATS_MAX} chats per month`
  return e
}
