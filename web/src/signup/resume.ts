import type { ResumeDraft } from '../store/onboarding'
import type { BasicsDraft } from '../store/onboarding'

export const RESUME_MAX_BYTES = 5 * 1024 * 1024
export const RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'] as const
export const RESUME_ACCEPT = [
  ...RESUME_EXTENSIONS,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
].join(',')

export const CAREER_STAGES = ['Student', 'Early career', 'Mid-career', 'Senior', 'Executive', 'Founder'] as const

export const TAG_MAX_LENGTH = 40
export const EXPERIENCE_TAGS_MAX = 15
export const SUMMARY_MAX = 800

/** Client-side check before uploading. Returns an error message, or null if the file is OK. */
export function checkResumeFile(file: { name: string; size: number }): string | null {
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : ''
  if (!(RESUME_EXTENSIONS as readonly string[]).includes(ext)) {
    return 'Please upload a PDF, Word (.doc or .docx), or .txt file.'
  }
  if (file.size === 0) return 'That file is empty.'
  if (file.size > RESUME_MAX_BYTES) return 'That file is over 5 MB. Please upload a smaller resume.'
  return null
}

/** Normalizes a tag the user typed. Returns an error message, or the cleaned tag. */
export function cleanTag(raw: string, existing: string[], ignoreIndex = -1): { tag: string } | { error: string } {
  const tag = raw.trim().replace(/\s+/g, ' ')
  if (!tag) return { error: 'Type a tag first' }
  if (tag.length > TAG_MAX_LENGTH) return { error: `Keep tags under ${TAG_MAX_LENGTH} characters` }
  const dup = existing.some((t, i) => i !== ignoreIndex && t.toLowerCase() === tag.toLowerCase())
  if (dup) return { error: 'You already have that tag' }
  return { tag }
}

export function isResumeComplete(r: ResumeDraft | null): r is ResumeDraft {
  return !!r && r.summary.trim().length > 0 && r.experienceTags.length > 0 && r.careerStage !== null
}

/** Cheap "did they finish Step 1" check used to guard deep links into later steps. */
export function isBasicsFilled(b: BasicsDraft): boolean {
  return !!(b.firstName && b.lastName && b.email && b.password && b.zip && b.birthYear && b.photoDataUrl &&
    b.is18Plus && b.identifiesAsWoman)
}
