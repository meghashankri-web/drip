import type { BasicsDraft } from '../store/onboarding'

export type ZipStatus = 'idle' | 'checking' | 'valid' | 'not_found' | 'error'
export type EmailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error'

export type BasicsErrors = Partial<Record<keyof BasicsDraft, string>>

export const MIN_AGE = 18
export const PASSWORD_MIN = 8

// Pragmatic email check: something@something.tld, no spaces.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isEmailWellFormed(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

/** Years shown in the birth-year dropdown (newest first). Includes a few under-18 years so the age rule is visible. */
export function birthYearOptions(currentYear: number): number[] {
  const years: number[] = []
  for (let y = currentYear - 13; y >= currentYear - 100; y--) years.push(y)
  return years
}

/**
 * Validates sign-up Step 1. Returns a message per invalid field; an empty object means valid.
 * Server lookups (ZIP exists, email unused) are passed in as statuses.
 */
export function validateBasics(
  b: BasicsDraft,
  ctx: { currentYear: number; zipStatus: ZipStatus; emailStatus: EmailStatus },
): BasicsErrors {
  const e: BasicsErrors = {}

  if (!b.firstName.trim()) e.firstName = 'First name is required'
  if (!b.lastName.trim()) e.lastName = 'Last name is required'

  if (!b.email.trim()) e.email = 'Email is required'
  else if (!isEmailWellFormed(b.email)) e.email = 'Enter a valid email, like name@example.com'
  else if (ctx.emailStatus === 'taken') e.email = 'An account with this email already exists'
  else if (ctx.emailStatus === 'checking') e.email = 'Checking email…'
  else if (ctx.emailStatus === 'error') e.email = 'Couldn’t check this email. Are you online?'

  if (!b.password) e.password = 'Password is required'
  else if (b.password.length < PASSWORD_MIN) e.password = `Use at least ${PASSWORD_MIN} characters`

  if (!b.zip) e.zip = 'ZIP code is required'
  else if (!/^\d{5}$/.test(b.zip)) e.zip = 'ZIP code must be 5 digits'
  else if (ctx.zipStatus === 'not_found') e.zip = 'We couldn’t find that ZIP code'
  else if (ctx.zipStatus === 'checking') e.zip = 'Looking up ZIP code…'
  else if (ctx.zipStatus === 'error') e.zip = 'Couldn’t check this ZIP code. Are you online?'

  if (b.birthYear === null) e.birthYear = 'Birth year is required'
  else if (ctx.currentYear - b.birthYear < MIN_AGE) e.birthYear = `Drip is for women ${MIN_AGE} and older`
  else if (b.birthYear < ctx.currentYear - 100) e.birthYear = 'Please choose a valid birth year'

  if (!b.photoDataUrl) e.photoDataUrl = 'Add a profile photo'

  if (!b.is18Plus) e.is18Plus = 'Please confirm you are 18 or older'
  else if (b.birthYear !== null && ctx.currentYear - b.birthYear < MIN_AGE) {
    e.is18Plus = 'Your birth year says you’re under 18'
  }
  if (!b.identifiesAsWoman) e.identifiesAsWoman = 'Drip is a community for women'

  // raceCulture is optional.
  return e
}
