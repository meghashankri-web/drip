import { Router } from 'express'
import type { DB } from '../db.js'

type UserRow = {
  id: number
  first_name: string
  last_name: string
  photo_path: string | null
  race_culture: string | null
  career_stage: string
  zip: string
  summary: string | null
  resume_text: string | null
  hobbies: string | null
  best_advice: string | null
  woman_admired: string | null
  ask_me_about: string | null
  meeting_pref: string
  chats_per_month: number
  created_at: string
  city: string | null
  state: string | null
}

export function usersRouter(db: DB): Router {
  const router = Router()

  const listUsers = db.prepare(`
    SELECT id, first_name, last_name, photo_path, career_stage
    FROM users ORDER BY id`)
  const getUser = db.prepare(`
    SELECT u.*, z.city, z.state
    FROM users u LEFT JOIN zip_locations z ON z.zip = u.zip
    WHERE u.id = ?`)
  const getExperience = db.prepare('SELECT tag FROM experience_tags WHERE user_id = ? ORDER BY rowid')
  const getInterests = db.prepare('SELECT tag FROM interest_tags WHERE user_id = ? ORDER BY rank')
  const getRippleCount = db.prepare(
    'SELECT count(*) AS n FROM ripples WHERE user_a_id = ? OR user_b_id = ?')

  /** Compact list, used by the demo profile switcher. */
  router.get('/', (_req, res) => {
    const rows = listUsers.all() as Pick<UserRow, 'id' | 'first_name' | 'last_name' | 'photo_path' | 'career_stage'>[]
    res.json(
      rows.map((r) => ({
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        photoUrl: r.photo_path,
        careerStage: r.career_stage,
      })),
    )
  })

  const emailExists = db.prepare('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE')

  /** Sign-up helper: is this email free? (Mock auth, so revealing this is acceptable.) */
  router.get('/email-available', (req, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email.trim() : ''
    if (!email) {
      res.status(400).json({ error: 'email is required' })
      return
    }
    res.json({ available: !emailExists.get(email) })
  })

  /** Public profile. Never includes email or password. */
  router.get('/:id', (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: 'Invalid user id' })
      return
    }
    const u = getUser.get(id) as UserRow | undefined
    if (!u) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    const tags = (rows: unknown[]) => (rows as { tag: string }[]).map((r) => r.tag)
    res.json({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      photoUrl: u.photo_path,
      raceCulture: u.race_culture,
      careerStage: u.career_stage,
      zip: u.zip,
      city: u.city,
      state: u.state,
      summary: u.summary,
      resumeText: u.resume_text,
      hobbies: u.hobbies,
      bestAdvice: u.best_advice,
      womanAdmired: u.woman_admired,
      askMeAbout: u.ask_me_about,
      meetingPref: u.meeting_pref,
      chatsPerMonth: u.chats_per_month,
      experienceTags: tags(getExperience.all(id)),
      interestTags: tags(getInterests.all(id)),
      rippleCount: (getRippleCount.get(id, id) as { n: number }).n,
      createdAt: u.created_at,
    })
  })

  return router
}
