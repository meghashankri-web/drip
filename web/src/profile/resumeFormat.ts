export type ResumeBlock =
  | { type: 'name'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'text'; text: string }

const BULLET = /^\s*(?:[-•*·▪●]|\d+[.)])\s+/
const COMMON_HEADINGS = new Set([
  'summary', 'profile', 'about', 'experience', 'work experience', 'professional experience', 'education',
  'skills', 'research', 'research experience', 'teaching', 'leadership', 'awards', 'honors', 'publications',
  'projects', 'volunteer', 'volunteering', 'certifications', 'languages', 'interests', 'activities',
])

function isHeading(line: string): boolean {
  const t = line.trim().replace(/:$/, '')
  if (!t || t.length > 40) return false
  if (COMMON_HEADINGS.has(t.toLowerCase())) return true
  // ALL-CAPS lines like "EXPERIENCE" or "LEADERSHIP & SERVICE"
  return /[A-Z]/.test(t) && t === t.toUpperCase() && !/[.,|@·]/.test(t) && t.split(/\s+/).length <= 5
}

/** Splits plain resume text into display blocks: name, section headings, bullet lists, and lines. */
export function parseResume(text: string): ResumeBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ResumeBlock[] = []
  let first = true
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (first) {
      blocks.push({ type: 'name', text: line })
      first = false
      continue
    }
    if (BULLET.test(line)) {
      const item = line.replace(BULLET, '')
      const last = blocks.at(-1)
      if (last?.type === 'bullets') last.items.push(item)
      else blocks.push({ type: 'bullets', items: [item] })
    } else if (isHeading(line)) {
      blocks.push({ type: 'heading', text: line.replace(/:$/, '') })
    } else {
      blocks.push({ type: 'text', text: line })
    }
  }
  return blocks
}
