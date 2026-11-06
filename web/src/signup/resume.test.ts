import { describe, expect, it } from 'vitest'
import { checkResumeFile, cleanTag, isResumeComplete } from './resume'

describe('checkResumeFile', () => {
  it.each(['cv.pdf', 'CV.PDF', 'cv.doc', 'cv.docx', 'cv.txt'])('accepts %s', (name) => {
    expect(checkResumeFile({ name, size: 1000 })).toBeNull()
  })
  it.each(['photo.png', 'cv.pages', 'cv', 'cv.pdf.exe'])('rejects %s', (name) => {
    expect(checkResumeFile({ name, size: 1000 })).toMatch(/PDF, Word/)
  })
  it('rejects files over 5 MB and empty files', () => {
    expect(checkResumeFile({ name: 'cv.pdf', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/)
    expect(checkResumeFile({ name: 'cv.pdf', size: 0 })).toMatch(/empty/)
  })
})

describe('cleanTag', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanTag('  Product   Management ', [])).toEqual({ tag: 'Product Management' })
  })
  it('rejects case-insensitive duplicates, except the tag being edited', () => {
    expect(cleanTag('sql', ['SQL'])).toHaveProperty('error')
    expect(cleanTag('sql', ['SQL'], 0)).toEqual({ tag: 'sql' })
  })
  it('rejects empty and overlong tags', () => {
    expect(cleanTag('   ', [])).toHaveProperty('error')
    expect(cleanTag('x'.repeat(41), [])).toHaveProperty('error')
  })
})

describe('isResumeComplete', () => {
  const base = { file: null, source: 'manual' as const, summary: 'Hi', experienceTags: ['SQL'], careerStage: 'Student' as const, resumeText: '' }
  it('needs a summary, at least one tag, and a career stage', () => {
    expect(isResumeComplete(base)).toBe(true)
    expect(isResumeComplete({ ...base, summary: '  ' })).toBe(false)
    expect(isResumeComplete({ ...base, experienceTags: [] })).toBe(false)
    expect(isResumeComplete({ ...base, careerStage: null })).toBe(false)
    expect(isResumeComplete(null)).toBe(false)
  })
})
