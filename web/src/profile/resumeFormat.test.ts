import { describe, expect, it } from 'vitest'
import { parseResume } from './resumeFormat'

describe('parseResume', () => {
  it('finds the name, headings, bullets, and plain lines', () => {
    const text = `KIARA BROOKS
Atlanta, GA | kiara@example.com

EDUCATION
Georgia Tech - B.S. Computer Science

Experience
Data Science Intern - Peachtree Analytics
- Built a churn model
• Created dashboards
SKILLS
Python, SQL`
    expect(parseResume(text)).toEqual([
      { type: 'name', text: 'KIARA BROOKS' },
      { type: 'text', text: 'Atlanta, GA | kiara@example.com' },
      { type: 'heading', text: 'EDUCATION' },
      { type: 'text', text: 'Georgia Tech - B.S. Computer Science' },
      { type: 'heading', text: 'Experience' },
      { type: 'text', text: 'Data Science Intern - Peachtree Analytics' },
      { type: 'bullets', items: ['Built a churn model', 'Created dashboards'] },
      { type: 'heading', text: 'SKILLS' },
      { type: 'text', text: 'Python, SQL' },
    ])
  })
  it('does not treat sentences or contact lines as headings', () => {
    const blocks = parseResume('Name\nI LOVE DATA, AND PEOPLE.\nGPA 3.8')
    expect(blocks.filter((b) => b.type === 'heading')).toEqual([])
  })
  it('handles empty text', () => {
    expect(parseResume('  \n\n ')).toEqual([])
  })
})
