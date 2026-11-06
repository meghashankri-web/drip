import { describe, expect, it } from 'vitest'
import { clampChats, validatePersonality } from './personality'
import { emptyPersonality } from '../store/onboarding'

const valid = {
  hobbies: 'Pottery', bestAdvice: 'Ask the question', womanAdmired: 'Dolores Huerta', askMeAbout: 'Career changes',
  meetingPref: 'either' as const, chatsPerMonth: 3,
}

describe('validatePersonality', () => {
  it('accepts a complete form', () => {
    expect(validatePersonality(valid)).toEqual({})
  })
  it('requires every answer and a meeting preference', () => {
    expect(Object.keys(validatePersonality(emptyPersonality)).sort()).toEqual(
      ['askMeAbout', 'bestAdvice', 'hobbies', 'meetingPref', 'womanAdmired'])
  })
  it('treats whitespace-only answers as empty and caps length', () => {
    expect(validatePersonality({ ...valid, hobbies: '   ' })).toHaveProperty('hobbies')
    expect(validatePersonality({ ...valid, askMeAbout: 'x'.repeat(201) })).toHaveProperty('askMeAbout')
  })
  it.each([0, 9, 2.5, -3])('rejects %s chats per month', (n) => {
    expect(validatePersonality({ ...valid, chatsPerMonth: n })).toHaveProperty('chatsPerMonth')
  })
})

describe('clampChats', () => {
  it.each([[0, 1], [1, 1], [8, 8], [12, 8], [3.6, 4], [Number.NaN, 1], ['5', 1]])('%s -> %s', (input, out) => {
    expect(clampChats(input)).toBe(out)
  })
})
