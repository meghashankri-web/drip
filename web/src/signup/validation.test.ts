import { describe, expect, it } from 'vitest'
import { birthYearOptions, validateBasics } from './validation'
import { emptyBasics, type BasicsDraft } from '../store/onboarding'

const YEAR = 2026
const ok = { currentYear: YEAR, zipStatus: 'valid', emailStatus: 'available' } as const
const valid: BasicsDraft = {
  ...emptyBasics,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  password: 'analytical',
  zip: '94720',
  birthYear: 1995,
  photoDataUrl: 'data:image/jpeg;base64,xyz',
  is18Plus: true,
  identifiesAsWoman: true,
}

describe('validateBasics', () => {
  it('accepts a complete form, with Race/Culture left blank', () => {
    expect(validateBasics(valid, ok)).toEqual({})
  })

  it('requires every field except Race/Culture', () => {
    const errors = validateBasics(emptyBasics, { ...ok, zipStatus: 'idle', emailStatus: 'idle' })
    expect(Object.keys(errors).sort()).toEqual(
      ['birthYear', 'email', 'firstName', 'identifiesAsWoman', 'is18Plus', 'lastName', 'password', 'photoDataUrl', 'zip'].sort(),
    )
  })

  it('requires both pledge checkboxes', () => {
    expect(validateBasics({ ...valid, is18Plus: false }, ok)).toHaveProperty('is18Plus')
    expect(validateBasics({ ...valid, identifiesAsWoman: false }, ok)).toHaveProperty('identifiesAsWoman')
  })

  it.each(['ada', 'ada@', 'ada@example', 'a da@example.com', '@example.com'])('rejects malformed email %s', (email) => {
    expect(validateBasics({ ...valid, email }, ok)).toHaveProperty('email')
  })

  it('rejects an email that is already registered', () => {
    expect(validateBasics(valid, { ...ok, emailStatus: 'taken' }).email).toMatch(/already exists/)
  })

  it.each(['9472', '947201', 'abcde', '94 72'])('rejects ZIP %s', (zip) => {
    expect(validateBasics({ ...valid, zip }, ok)).toHaveProperty('zip')
  })

  it('rejects a well-formed ZIP that does not exist', () => {
    expect(validateBasics(valid, { ...ok, zipStatus: 'not_found' })).toHaveProperty('zip')
  })

  it('requires the birth year to agree with 18+', () => {
    const young = validateBasics({ ...valid, birthYear: YEAR - 17 }, ok)
    expect(young).toHaveProperty('birthYear')
    expect(young).toHaveProperty('is18Plus')
    expect(validateBasics({ ...valid, birthYear: YEAR - 18 }, ok)).toEqual({})
  })

  it('requires a password of at least 8 characters', () => {
    expect(validateBasics({ ...valid, password: 'short' }, ok)).toHaveProperty('password')
  })
})

describe('birthYearOptions', () => {
  it('runs newest to oldest and includes under-18 years', () => {
    const years = birthYearOptions(YEAR)
    expect(years[0]).toBe(YEAR - 13)
    expect(years.at(-1)).toBe(YEAR - 100)
  })
})
