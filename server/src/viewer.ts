import type { Request } from 'express'

/**
 * Mock auth: the web app sends the acting user's id in the X-Drip-User header (set by sign-up or the
 * demo profile switcher). Real authentication is out of scope for the hackathon demo.
 */
export function getViewerId(req: Request): number | null {
  const raw = req.get('x-drip-user')
  const id = raw ? Number(raw) : NaN
  return Number.isInteger(id) && id > 0 ? id : null
}
