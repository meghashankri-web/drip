import fs from 'node:fs'
import path from 'node:path'
import { createAvatar } from '@dicebear/core'
import { personas } from '@dicebear/collection'
import { z } from 'zod'
import { SERVER_ROOT, UPLOADS_DIR, type DB } from '../src/db.js'

const DB_DIR = path.join(SERVER_ROOT, 'db')
const SEED_UPLOADS = path.join(UPLOADS_DIR, 'seed')

// ---------- Seed data shape (validated so typos fail loudly) ----------

const CAREER_STAGES = ['Student', 'Early career', 'Mid-career', 'Senior', 'Executive', 'Founder'] as const
const hex = z.string().regex(/^[0-9a-f]{6}$/)

const SeedUser = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  zip: z.string().regex(/^\d{5}$/),
  birthYear: z.number().int().min(1940).max(2008),
  raceCulture: z.string(),
  careerStage: z.enum(CAREER_STAGES),
  summary: z.string().min(1),
  experienceTags: z.array(z.string().min(1)).min(3),
  interestTags: z.array(z.string().min(1)).min(1).max(5),
  hobbies: z.string(),
  bestAdvice: z.string(),
  womanAdmired: z.string(),
  askMeAbout: z.string(),
  meetingPref: z.enum(['in_person', 'zoom', 'either']),
  chatsPerMonth: z.number().int().min(1).max(8),
  avatar: z.object({
    hair: z.enum(['long', 'curlyHighTop', 'bobCut', 'curly', 'pigtails', 'curlyBun', 'bobBangs',
      'straightBun', 'extraLong', 'bunUndercut', 'sideShave']),
    skin: hex,
    hairColor: hex,
    eyes: z.enum(['open', 'happy', 'glasses', 'wink']),
    mouth: z.enum(['smile', 'bigSmile', 'lips', 'smirk']),
    clothing: hex,
    bg: hex,
  }),
  resumeText: z.string().min(1),
})

const SeedData = z.object({
  users: z.array(SeedUser).length(20),
  ripples: z.array(z.object({
    a: z.number().int(), b: z.number().int(), daysAgo: z.number().int().positive(), place: z.string(),
  })),
  posts: z.array(z.object({
    author: z.number().int(), partner: z.number().int(), scene: z.number().int().min(0), caption: z.string(),
  })),
  cheers: z.array(z.object({ post: z.number().int(), users: z.array(z.number().int()) })),
})

type SeedData = z.infer<typeof SeedData>

function loadSeedData(): SeedData {
  const raw = JSON.parse(fs.readFileSync(path.join(DB_DIR, 'seed-data.json'), 'utf8'))
  return SeedData.parse(raw)
}

// ---------- ZIP locations ----------

export function loadZipLocations(db: DB): number {
  const lines = fs.readFileSync(path.join(DB_DIR, 'zip_locations.csv'), 'utf8').trim().split('\n')
  const insert = db.prepare(
    'INSERT OR REPLACE INTO zip_locations (zip, lat, lng, city, state) VALUES (?, ?, ?, ?, ?)',
  )
  const rows = lines.slice(1) // skip header
  db.transaction(() => {
    for (const line of rows) {
      const [zip, lat, lng, city, state] = line.split(',')
      if (!zip || !lat || !lng) continue
      insert.run(zip, Number(lat), Number(lng), city ?? '', state ?? '')
    }
  })()
  return rows.length
}

// ---------- Generated images ----------

function avatarSvg(seed: string, a: z.infer<typeof SeedUser>['avatar']): string {
  return createAvatar(personas, {
    seed,
    hair: [a.hair],
    skinColor: [a.skin],
    hairColor: [a.hairColor],
    eyes: [a.eyes],
    mouth: [a.mouth],
    clothingColor: [a.clothing],
    backgroundColor: [a.bg],
    nose: ['smallRound', 'mediumRound'],
    facialHairProbability: 0,
  })
    .toString()
    // Personas paints white "overlay" highlights on skin and hair. They wash out dark skin
    // and dark hair (making them look grey), so drop them and keep the true colors.
    .replace(/<path(?=[^>]*fill="#fff")(?=[^>]*mix-blend-mode)[^>]*\/>/g, '')
}

/** Simple illustrated coffee-chat scene in Drip's espresso/cream palette. */
function coffeeSceneSvg(variant: number): string {
  const palettes = [
    { bg: '#f3e3cc', table: '#3d2500', cupA: '#fcf9f2', cupB: '#c96f4a', accent: '#d4a056' },
    { bg: '#e8d5b9', table: '#5a3a14', cupA: '#4f7d6b', cupB: '#fcf9f2', accent: '#c96f4a' },
    { bg: '#fcf9f2', table: '#3d2500', cupA: '#d4a056', cupB: '#7a4b8f', accent: '#e8d5b9' },
    { bg: '#ead7c3', table: '#6b4430', cupA: '#fcf9f2', cupB: '#3f8f8a', accent: '#e16381' },
    { bg: '#f6ead8', table: '#3d2500', cupA: '#e24553', cupB: '#fcf9f2', accent: '#d4a056' },
  ]
  const p = palettes[variant % palettes.length]!
  const steam = (x: number) =>
    `<path d="M${x} 250 q-14 -22 0 -44 q14 -22 0 -44" stroke="${p.table}" stroke-opacity="0.35" stroke-width="7" fill="none" stroke-linecap="round"/>`
  const cup = (x: number, color: string) => `
    <rect x="${x}" y="280" width="120" height="110" rx="22" fill="${color}" stroke="${p.table}" stroke-width="6"/>
    <path d="M${x + 120} 305 h18 a26 26 0 0 1 0 52 h-18" fill="none" stroke="${p.table}" stroke-width="10"/>
    <ellipse cx="${x + 60}" cy="282" rx="52" ry="10" fill="${p.table}" fill-opacity="0.85"/>
    ${steam(x + 42)}${steam(x + 78)}`
  const extra =
    variant % 2 === 0
      ? `<path d="M470 430 q40 -50 80 0 q-40 20 -80 0z" fill="${p.accent}" stroke="${p.table}" stroke-width="5"/>`
      : `<g transform="translate(525 330)"><rect x="-22" y="40" width="44" height="50" rx="8" fill="${p.accent}"/><path d="M0 40 q-30 -40 -6 -70 M0 40 q30 -40 6 -70 M0 40 v-80" stroke="#4f7d6b" stroke-width="8" fill="none" stroke-linecap="round"/></g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <rect width="600" height="600" fill="${p.bg}"/>
  <circle cx="${120 + variant * 70}" cy="120" r="70" fill="${p.accent}" fill-opacity="0.35"/>
  <path d="M300 70 q-26 40 -26 62 a26 26 0 0 0 52 0 q0 -22 -26 -62z" fill="${p.table}" fill-opacity="0.18"/>
  <rect x="0" y="390" width="600" height="210" fill="${p.table}"/>
  <rect x="0" y="390" width="600" height="14" fill="#000" fill-opacity="0.15"/>
  ${cup(150, p.cupA)}
  ${cup(310, p.cupB)}
  ${extra}
</svg>`
}

function writeFile(relUrl: string, contents: string): string {
  // relUrl like "/uploads/seed/avatars/user-1.svg"
  const abs = path.join(SERVER_ROOT, relUrl)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, contents)
  return relUrl
}

// ---------- Seeding ----------

const DAY_MS = 24 * 60 * 60 * 1000
/** A timestamp N days (plus hours) before now, pinned to 17:00 UTC (10am Pacific). */
function daysAgo(days: number, plusHours = 0): string {
  const d = new Date(Date.now() - days * DAY_MS)
  d.setUTCHours(17 + plusHours, 0, 0, 0)
  return d.toISOString()
}

export function seedDatabase(db: DB): void {
  const data = loadSeedData()
  fs.rmSync(SEED_UPLOADS, { recursive: true, force: true })

  const insertUser = db.prepare(`
    INSERT INTO users (id, first_name, last_name, email, password, zip, birth_year, photo_path, race_culture,
      is_18_plus, identifies_as_woman, career_stage, resume_path, resume_text, summary, hobbies, best_advice,
      woman_admired, ask_me_about, meeting_pref, chats_per_month, created_at)
    VALUES (@id, @firstName, @lastName, @email, 'demo', @zip, @birthYear, @photoPath, @raceCulture,
      1, 1, @careerStage, NULL, @resumeText, @summary, @hobbies, @bestAdvice,
      @womanAdmired, @askMeAbout, @meetingPref, @chatsPerMonth, @createdAt)`)
  const insertExp = db.prepare('INSERT INTO experience_tags (user_id, tag) VALUES (?, ?)')
  const insertInt = db.prepare('INSERT INTO interest_tags (user_id, tag, rank) VALUES (?, ?, ?)')
  const insertRequest = db.prepare(`
    INSERT INTO chat_requests (from_user_id, to_user_id, message, availability, status, created_at)
    VALUES (?, ?, ?, ?, 'completed', ?)`)
  const insertMeeting = db.prepare(`
    INSERT INTO meetings (request_id, datetime, location, confirmed_by_from, confirmed_by_to)
    VALUES (?, ?, ?, 1, 1)`)
  const insertRipple = db.prepare(
    'INSERT INTO ripples (user_a_id, user_b_id, meeting_id, created_at) VALUES (?, ?, ?, ?)')
  const insertPost = db.prepare(`
    INSERT INTO posts (author_id, ripple_partner_id, meeting_id, photo_path, caption, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
  const insertCheers = db.prepare('INSERT INTO cheers (post_id, user_id, created_at) VALUES (?, ?, ?)')
  const insertMessage = db.prepare(`
    INSERT INTO messages (to_user_id, from_user_id, type, ref_id, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`)

  db.transaction(() => {
    // Users
    data.users.forEach((u, i) => {
      const id = i + 1
      const email = `${u.firstName}.${u.lastName}@example.com`
        .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z.@-]/g, '').toLowerCase()
      const photoPath = writeFile(`/uploads/seed/avatars/user-${id}.svg`, avatarSvg(`${u.firstName}-${u.lastName}`, u.avatar))
      insertUser.run({
        ...u,
        id,
        email,
        photoPath,
        raceCulture: u.raceCulture.trim() || null,
        createdAt: daysAgo(90 - i),
      })
      u.experienceTags.forEach((t) => insertExp.run(id, t))
      u.interestTags.forEach((t, r) => insertInt.run(id, t, r + 1))
    })

    const userName = (id: number) => data.users[id - 1]?.firstName ?? 'Someone'
    const exists = (id: number) => id >= 1 && id <= data.users.length

    // Ripples: each needs a completed request and a confirmed meeting.
    const meetingByPair = new Map<string, number>()
    const pairKey = (x: number, y: number) => `${Math.min(x, y)}-${Math.max(x, y)}`
    for (const r of data.ripples) {
      if (!exists(r.a) || !exists(r.b) || r.a === r.b) throw new Error(`Bad ripple ${r.a}-${r.b}`)
      const avail = JSON.stringify([{ day: 'Sat', block: 'Morning' }, { day: 'Wed', block: 'Lunch' }])
      const req = insertRequest.run(r.a, r.b, `Hi ${userName(r.b)}! Would love to hear about your path. Coffee soon?`,
        avail, daysAgo(r.daysAgo + 7))
      const location = r.place === 'Zoom' ? 'https://zoom.us/j/0000000000 (demo link)' : r.place
      const mtg = insertMeeting.run(req.lastInsertRowid, daysAgo(r.daysAgo), location)
      const meetingId = Number(mtg.lastInsertRowid)
      insertRipple.run(Math.min(r.a, r.b), Math.max(r.a, r.b), meetingId, daysAgo(r.daysAgo, 2))
      meetingByPair.set(pairKey(r.a, r.b), meetingId)
    }

    // Posts (must belong to an existing ripple)
    const postDates: string[] = []
    data.posts.forEach((p, i) => {
      const meetingId = meetingByPair.get(pairKey(p.author, p.partner))
      if (!meetingId) throw new Error(`Post ${i + 1} has no matching ripple`)
      const ripple = data.ripples.find((r) => pairKey(r.a, r.b) === pairKey(p.author, p.partner))!
      const photo = writeFile(`/uploads/seed/posts/scene-${p.scene}.svg`, coffeeSceneSvg(p.scene))
      const createdAt = daysAgo(ripple.daysAgo, 4)
      postDates.push(createdAt)
      insertPost.run(p.author, p.partner, meetingId, photo, p.caption, createdAt)
    })

    // Cheers + a message to the author for each
    for (const c of data.cheers) {
      const post = data.posts[c.post - 1]
      if (!post) throw new Error(`Cheers for unknown post ${c.post}`)
      c.users.forEach((uid, j) => {
        if (!exists(uid) || uid === post.author) throw new Error(`Bad cheers ${uid} on post ${c.post}`)
        const at = new Date(Date.parse(postDates[c.post - 1]!) + (j + 1) * 3 * 60 * 60 * 1000).toISOString()
        insertCheers.run(c.post, uid, at)
        insertMessage.run(post.author, uid, 'cheers', c.post, `${userName(uid)} cheered your post 🥂`, at)
      })
    }
  })()
}

/** Loads ZIPs (if missing) and seeds users (if the users table is empty). */
export function ensureSeeded(db: DB): void {
  const zips = db.prepare('SELECT count(*) AS n FROM zip_locations').get() as { n: number }
  if (zips.n === 0) loadZipLocations(db)
  const users = db.prepare('SELECT count(*) AS n FROM users').get() as { n: number }
  if (users.n === 0) seedDatabase(db)
}

/** Drops every table, reapplies the schema, and reseeds. Safe to run while the server is up. */
export function resetDatabase(db: DB): void {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[]
  db.pragma('foreign_keys = OFF')
  db.transaction(() => {
    for (const t of tables) db.exec(`DROP TABLE IF EXISTS "${t.name}"`)
  })()
  db.pragma('foreign_keys = ON')
  db.exec(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8'))

  // Remove user-uploaded files (photos, resumes); seed images are regenerated below.
  for (const entry of fs.readdirSync(UPLOADS_DIR)) {
    if (entry !== '.gitkeep') fs.rmSync(path.join(UPLOADS_DIR, entry), { recursive: true, force: true })
  }

  loadZipLocations(db)
  seedDatabase(db)
}
