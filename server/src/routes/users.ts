import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { UPLOADS_DIR, type DB } from '../db.js'
import { CAREER_STAGES } from '../claude.js'
import { RESUMES_DIR } from './resume.js'
import { getViewerId } from '../viewer.js'

const PHOTOS_DIR = path.join(UPLOADS_DIR, 'photos')
const PHOTO_MAX_BYTES = 2 * 1024 * 1024
const tag = z.string().trim().min(1).max(40)
const answer = z.string().trim().min(1).max(200)

/** Everything sign-up collects. The server re-checks it all; the browser's checks are for UX only. */
const CreateUser = z.object({
  basics: z.object({
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    email: z.string().trim().toLowerCase().email().max(120),
    password: z.string().min(8).max(200),
    zip: z.string().regex(/^\d{5}$/),
    birthYear: z.number().int(),
    photoDataUrl: z.string().startsWith('data:image/'),
    raceCulture: z.string().trim().max(60),
    is18Plus: z.literal(true),
    identifiesAsWoman: z.literal(true),
  }),
  resume: z.object({
    fileId: z.string().regex(/^[0-9a-f-]{36}\.(pdf|doc|docx|txt)$/).nullable(),
    summary: z.string().trim().min(1).max(800),
    experienceTags: z.array(tag).min(1).max(15),
    careerStage: z.enum(CAREER_STAGES),
    resumeText: z.string().max(50_000),
  }),
  interests: z.array(tag).min(1).max(5),
  personality: z.object({
    hobbies: answer,
    bestAdvice: answer,
    womanAdmired: answer,
    askMeAbout: answer,
    meetingPref: z.enum(['in_person', 'zoom', 'either']),
    chatsPerMonth: z.number().int().min(1).max(8),
  }),
})

const hasDuplicates = (tags: string[]) => new Set(tags.map((t) => t.toLowerCase())).size !== tags.length

/** Decodes a JPEG/PNG/WebP data URL and checks the bytes really are that image type. */
function decodePhoto(dataUrl: string): { buffer: Buffer; ext: string } | null {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!m) return null
  const buffer = Buffer.from(m[2]!, 'base64')
  if (buffer.length === 0 || buffer.length > PHOTO_MAX_BYTES) return null
  const magic: Record<string, (b: Buffer) => boolean> = {
    jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    webp: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  }
  if (!magic[m[1]!]!(buffer)) return null
  return { buffer, ext: m[1] === 'jpeg' ? 'jpg' : m[1]! }
}

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

  const zipExists = db.prepare('SELECT 1 FROM zip_locations WHERE zip = ?')
  const insertUser = db.prepare(`
    INSERT INTO users (first_name, last_name, email, password, zip, birth_year, photo_path, race_culture,
      is_18_plus, identifies_as_woman, career_stage, resume_path, resume_text, summary, hobbies, best_advice,
      woman_admired, ask_me_about, meeting_pref, chats_per_month)
    VALUES (@firstName, @lastName, @email, @password, @zip, @birthYear, @photoPath, @raceCulture,
      1, 1, @careerStage, @resumePath, @resumeText, @summary, @hobbies, @bestAdvice,
      @womanAdmired, @askMeAbout, @meetingPref, @chatsPerMonth)`)
  const insertExperience = db.prepare('INSERT INTO experience_tags (user_id, tag) VALUES (?, ?)')
  const insertInterest = db.prepare('INSERT INTO interest_tags (user_id, tag, rank) VALUES (?, ?, ?)')

  /** POST /api/users: create an account from the sign-up flow. Returns { id }. */
  router.post('/', (req, res) => {
    const parsed = CreateUser.safeParse(req.body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      res.status(400).json({ error: `Please check your answers (${issue?.path.join('.') ?? 'form'}).` })
      return
    }
    const { basics, resume, interests, personality } = parsed.data
    const fail = (status: number, error: string, step: number) => res.status(status).json({ error, step })

    const year = new Date().getFullYear()
    if (year - basics.birthYear < 18 || basics.birthYear < year - 100) return fail(400, 'Please check your birth year.', 1)
    if (!zipExists.get(basics.zip)) return fail(400, 'We couldn’t find that ZIP code.', 1)
    if (emailExists.get(basics.email)) return fail(409, 'An account with this email already exists.', 1)
    if (hasDuplicates(resume.experienceTags)) return fail(400, 'Your experience tags have a duplicate.', 2)
    if (hasDuplicates(interests)) return fail(400, 'Your interests have a duplicate.', 3)
    if (resume.fileId && !fs.existsSync(path.join(RESUMES_DIR, resume.fileId))) {
      return fail(400, 'Your uploaded resume has expired. Please upload it again.', 2)
    }
    const photo = decodePhoto(basics.photoDataUrl)
    if (!photo) return fail(400, 'Please choose your profile photo again.', 1)

    fs.mkdirSync(PHOTOS_DIR, { recursive: true })
    const photoFile = `${randomUUID()}.${photo.ext}`
    fs.writeFileSync(path.join(PHOTOS_DIR, photoFile), photo.buffer)

    try {
      const id = db.transaction(() => {
        const result = insertUser.run({
          ...basics,
          raceCulture: basics.raceCulture || null,
          photoPath: `/uploads/photos/${photoFile}`,
          careerStage: resume.careerStage,
          resumePath: resume.fileId ? `/uploads/resumes/${resume.fileId}` : null,
          resumeText: resume.resumeText.trim() || null,
          summary: resume.summary,
          ...personality,
        })
        const userId = Number(result.lastInsertRowid)
        resume.experienceTags.forEach((t) => insertExperience.run(userId, t))
        interests.forEach((t, i) => insertInterest.run(userId, t, i + 1))
        return userId
      })()
      console.log(`[users] created #${id} ${basics.firstName} ${basics.lastName} (${resume.careerStage})`)
      res.status(201).json({ id })
    } catch (error) {
      fs.rmSync(path.join(PHOTOS_DIR, photoFile), { force: true })
      if (error instanceof Error && /UNIQUE constraint failed: users\.email/.test(error.message)) {
        return fail(409, 'An account with this email already exists.', 1)
      }
      throw error
    }
  })

  const updateChats = db.prepare('UPDATE users SET chats_per_month = ? WHERE id = ?')

  /** PATCH /api/users/:id/preferences { chatsPerMonth } — only the user herself. */
  router.patch('/:id/preferences', (req, res) => {
    const id = Number(req.params.id)
    if (getViewerId(req) !== id) {
      res.status(403).json({ error: 'You can only change your own preferences.' })
      return
    }
    const parsed = z.object({ chatsPerMonth: z.number().int().min(1).max(8) }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Chats per month must be between 1 and 8.' })
      return
    }
    const result = updateChats.run(parsed.data.chatsPerMonth, id)
    if (result.changes === 0) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({ chatsPerMonth: parsed.data.chatsPerMonth })
  })

  const listPosts = db.prepare(`
    SELECT p.id, p.photo_path, p.caption, p.created_at, p.author_id,
      pu.id AS partner_id, pu.first_name AS partner_first, pu.last_name AS partner_last, pu.photo_path AS partner_photo,
      (SELECT count(*) FROM cheers c WHERE c.post_id = p.id) AS cheers,
      EXISTS (SELECT 1 FROM cheers c WHERE c.post_id = p.id AND c.user_id = @viewer) AS viewer_cheered
    FROM posts p JOIN users pu ON pu.id = p.ripple_partner_id
    WHERE p.author_id = @author
    ORDER BY p.created_at DESC`)

  /**
   * GET /api/users/:id/posts: the Posts tab. The cheers total is included only when the viewer
   * is the author (Step 14 privacy rule); others only learn whether they cheered it themselves.
   */
  router.get('/:id/posts', (req, res) => {
    const author = Number(req.params.id)
    if (!Number.isInteger(author) || author < 1) {
      res.status(400).json({ error: 'Invalid user id' })
      return
    }
    const viewer = getViewerId(req)
    const rows = listPosts.all({ author, viewer: viewer ?? -1 }) as {
      id: number; photo_path: string | null; caption: string | null; created_at: string; author_id: number
      partner_id: number; partner_first: string; partner_last: string; partner_photo: string | null
      cheers: number; viewer_cheered: number
    }[]
    res.json(
      rows.map((r) => ({
        id: r.id,
        photoUrl: r.photo_path,
        caption: r.caption,
        createdAt: r.created_at,
        partner: { id: r.partner_id, firstName: r.partner_first, lastName: r.partner_last, photoUrl: r.partner_photo },
        cheeredByViewer: r.viewer_cheered === 1,
        ...(viewer === r.author_id ? { cheersCount: r.cheers } : {}),
      })),
    )
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
