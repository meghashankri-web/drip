/** Google Calendar "add event" link (no OAuth needed). Times are sent in UTC. */
export function googleCalendarUrl(opts: { title: string; start: string; minutes?: number; details: string; location: string }): string {
  const start = new Date(opts.start)
  const end = new Date(start.getTime() + (opts.minutes ?? 60) * 60_000)
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: opts.details,
    location: opts.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
