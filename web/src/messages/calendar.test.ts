import { describe, expect, it } from 'vitest'
import { googleCalendarUrl } from './calendar'

describe('googleCalendarUrl', () => {
  it('builds a pre-filled Google Calendar link', () => {
    const url = new URL(googleCalendarUrl({ title: 'Coffee chat', start: '2026-11-08T18:00:00.000Z', details: 'Hi', location: 'Blue Bottle' }))
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('text')).toBe('Coffee chat')
    expect(url.searchParams.get('dates')).toBe('20261108T180000Z/20261108T190000Z')
    expect(url.searchParams.get('location')).toBe('Blue Bottle')
  })
})
