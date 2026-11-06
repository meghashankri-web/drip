import { Router } from 'express'
import { z } from 'zod'
import type { DB } from '../db.js'
import { distanceMiles } from '../geo.js'
import { getViewerId } from '../viewer.js'

export const FEED_LIMIT = 20

type CandidateRow = {
  id: number
  first_name: string
  last_name: string
  photo_path: string | null
  career_stage: string
  race_culture: string | null
  meeting_pref: string
  hobbies: string | null
  best_advice: string | null
  woman_admired: string | null
  ask_me_about: string | null
  zip: string
  city: string | null
  state: string | null
  lat: number | null
  lng: number | null
}

const FUN_FACTS = [
  { key: 'ask_me_about', label: 'Ask me about' },
  { key: 'hobbies', label: 'Hobbies' },
  { key: 'woman_admired', label: 'A woman I look up to' },
  { key: 'best_advice', label: 'Best advice' },
] as const

/** One Step 4 answer per card, varied across people so the feed doesn't feel repetitive. */
function pickFunFact(row: CandidateRow): { label: string; text: string } | null {
  for (let i = 0; i < FUN_FACTS.length; i++) {
    const f = FUN_FACTS[(row.id + i) % FUN_FACTS.length]!
    const text = row[f.key]
    if (text) return { label: f.label, text }
  }
  return null
}

/** Resolves who the feed is for: the X-Drip-User header, or ?userId= (used by Step 9's debug view). */
function feedUserId(req: Parameters<typeof getViewerId>[0]): number | null {
  const fromQuery = Number(req.query.userId)
  if (Number.isInteger(fromQuery) && fromQuery > 0) return fromQuery
  return getViewerId(req)
}

export function feedRouter(db: DB): Router {
  const router = Router()

  const getViewer = db.prepare(`
    SELECT u.id, z.lat, z.lng FROM users u LEFT JOIN zip_locations z ON z.zip = u.zip WHERE u.id = ?`)

  // Everyone except: herself, people she has swiped on, and people she has an open request with
  // (pending, accepted, or "not now" until rematch_after passes) in either direction.
  const listCandidates = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.photo_path, u.career_stage, u.race_culture, u.meeting_pref,
      u.hobbies, u.best_advice, u.woman_admired, u.ask_me_about, u.zip, z.city, z.state, z.lat, z.lng
    FROM users u LEFT JOIN zip_locations z ON z.zip = u.zip
    WHERE u.id <> @me
      AND NOT EXISTS (SELECT 1 FROM swipes s WHERE s.user_id = @me AND s.target_user_id = u.id)
      AND NOT EXISTS (
        SELECT 1 FROM chat_requests r
        WHERE ((r.from_user_id = @me AND r.to_user_id = u.id) OR (r.from_user_id = u.id AND r.to_user_id = @me))
          AND (r.status IN ('pending', 'accepted') OR (r.status = 'not_now' AND r.rematch_after > @now))
      )
    ORDER BY u.id`)
  const experienceFor = db.prepare('SELECT tag FROM experience_tags WHERE user_id = ? ORDER BY rowid')
  const interestsFor = db.prepare('SELECT tag FROM interest_tags WHERE user_id = ? ORDER BY rank')

  /** GET /api/feed: up to 20 people for the viewer to consider. Ranking arrives in Step 9. */
  router.get('/feed', (req, res) => {
    const me = feedUserId(req)
    if (me === null) {
      res.status(401).json({ error: 'Choose a profile first.' })
      return
    }
    const viewer = getViewer.get(me) as { id: number; lat: number | null; lng: number | null } | undefined
    if (!viewer) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    const rows = listCandidates.all({ me, now: new Date().toISOString() }) as CandidateRow[]
    const tags = (rows: unknown[]) => (rows as { tag: string }[]).map((r) => r.tag)
    const cards = rows.slice(0, FEED_LIMIT).map((r) => {
      const miles =
        viewer.lat !== null && viewer.lng !== null && r.lat !== null && r.lng !== null
          ? distanceMiles(viewer.lat, viewer.lng, r.lat, r.lng)
          : null
      return {
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        photoUrl: r.photo_path,
        careerStage: r.career_stage,
        raceCulture: r.race_culture,
        meetingPref: r.meeting_pref,
        city: r.city,
        state: r.state,
        distanceMiles: miles === null ? null : Math.round(miles * 10) / 10,
        experienceTags: tags(experienceFor.all(r.id)).slice(0, 4),
        interestTags: tags(interestsFor.all(r.id)).slice(0, 3),
        funFact: pickFunFact(r),
      }
    })
    res.json({ cards, remaining: Math.max(0, rows.length - cards.length) })
  })

  const userExists = db.prepare('SELECT 1 FROM users WHERE id = ?')
  const upsertSwipe = db.prepare(`
    INSERT INTO swipes (user_id, target_user_id, direction) VALUES (?, ?, ?)
    ON CONFLICT (user_id, target_user_id) DO UPDATE SET direction = excluded.direction,
      created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
  const deleteSwipe = db.prepare('DELETE FROM swipes WHERE user_id = ? AND target_user_id = ?')

  /** POST /api/swipes { targetUserId, direction }: records a pass (left) or a request (right). */
  router.post('/swipes', (req, res) => {
    const me = getViewerId(req)
    const parsed = z.object({ targetUserId: z.number().int().positive(), direction: z.enum(['left', 'right']) }).safeParse(req.body)
    if (me === null) {
      res.status(401).json({ error: 'Choose a profile first.' })
      return
    }
    if (!parsed.success || parsed.data.targetUserId === me || !userExists.get(parsed.data.targetUserId)) {
      res.status(400).json({ error: 'Invalid swipe.' })
      return
    }
    upsertSwipe.run(me, parsed.data.targetUserId, parsed.data.direction)
    res.status(201).json({ ok: true })
  })

  /** DELETE /api/swipes/:targetUserId: undo a pass. */
  router.delete('/swipes/:targetUserId', (req, res) => {
    const me = getViewerId(req)
    if (me === null) {
      res.status(401).json({ error: 'Choose a profile first.' })
      return
    }
    deleteSwipe.run(me, Number(req.params.targetUserId))
    res.json({ ok: true })
  })

  return router
}
