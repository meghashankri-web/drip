import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { UPLOADS_DIR, type DB } from '../db.js'
import { getViewerId } from '../viewer.js'
import { decodePhoto } from './users.js'

type MeetingCtx = { id: number; request_id: number; datetime: string; from_user_id: number; to_user_id: number; status: string }

export function meetingsRouter(db: DB): Router {
  const router = Router()
  const getMeeting = db.prepare(`
    SELECT m.id, m.request_id, m.datetime, r.from_user_id, r.to_user_id, r.status
    FROM meetings m JOIN chat_requests r ON r.id = m.request_id WHERE m.id = ?`)
  const firstName = (id: number) => (db.prepare('SELECT first_name FROM users WHERE id = ?').get(id) as { first_name: string }).first_name

  function load(req: Parameters<typeof getViewerId>[0], res: import('express').Response) {
    const me = getViewerId(req)
    const m = getMeeting.get(Number(req.params.id)) as MeetingCtx | undefined
    if (!m || me === null || (me !== m.from_user_id && me !== m.to_user_id)) {
      res.status(404).json({ error: 'Meeting not found.' })
      return null
    }
    return { me, m, other: me === m.from_user_id ? m.to_user_id : m.from_user_id }
  }

  /** Demo control: move the meeting into the past so the post-meeting prompt appears right away. */
  router.post('/:id/simulate-passed', (req, res) => {
    const ctx = load(req, res)
    if (!ctx) return
    db.prepare('UPDATE meetings SET datetime = ? WHERE id = ?').run(new Date(Date.now() - 60 * 60 * 1000).toISOString(), ctx.m.id)
    res.json({ ok: true })
  })

  const insertRipple = db.prepare('INSERT OR IGNORE INTO ripples (user_a_id, user_b_id, meeting_id) VALUES (?, ?, ?)')

  /** POST /:id/confirm { happened, explanation? } — the mandatory "did it happen?" answer. */
  router.post('/:id/confirm', (req, res) => {
    const ctx = load(req, res)
    if (!ctx) return
    const parsed = z.object({ happened: z.boolean(), explanation: z.string().trim().max(300).optional() }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Please answer the question.' })
      return
    }
    const { happened, explanation } = parsed.data
    if (!happened && !explanation) {
      res.status(400).json({ error: 'Please share a short explanation.' })
      return
    }
    const col = ctx.me === ctx.m.from_user_id ? 'confirmed_by_from' : 'confirmed_by_to'
    db.transaction(() => {
      if (happened) {
        db.prepare(`UPDATE meetings SET ${col} = 1 WHERE id = ?`).run(ctx.m.id)
        db.prepare("UPDATE chat_requests SET status = 'completed' WHERE id = ?").run(ctx.m.request_id)
        // One ripple per meeting (UNIQUE meeting_id), so answering twice never double-counts.
        insertRipple.run(Math.min(ctx.me, ctx.other), Math.max(ctx.me, ctx.other), ctx.m.id)
      } else {
        db.prepare(`UPDATE meetings SET ${col} = -1, notes = ? WHERE id = ?`).run(explanation, ctx.m.id)
        db.prepare("UPDATE chat_requests SET status = 'did_not_happen' WHERE id = ?").run(ctx.m.request_id)
      }
    })()
    res.json({ ok: true, rippleCount: (db.prepare('SELECT count(*) AS n FROM ripples WHERE user_a_id = ? OR user_b_id = ?').get(ctx.me, ctx.me) as { n: number }).n })
  })

  /** POST /:id/post { photoDataUrl?, caption } — optional photo + kind words after "Yes". */
  router.post('/:id/post', (req, res) => {
    const ctx = load(req, res)
    if (!ctx) return
    const parsed = z.object({ caption: z.string().trim().min(1).max(500), photoDataUrl: z.string().nullable().optional() }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Add a few kind words.' })
      return
    }
    if (!db.prepare('SELECT 1 FROM ripples WHERE meeting_id = ?').get(ctx.m.id)) {
      res.status(409).json({ error: 'Confirm the chat happened first.' })
      return
    }
    let photoPath: string | null = null
    if (parsed.data.photoDataUrl) {
      const photo = decodePhoto(parsed.data.photoDataUrl)
      if (!photo) {
        res.status(400).json({ error: 'Please choose the photo again.' })
        return
      }
      const dir = path.join(UPLOADS_DIR, 'posts')
      fs.mkdirSync(dir, { recursive: true })
      const file = `${randomUUID()}.${photo.ext}`
      fs.writeFileSync(path.join(dir, file), photo.buffer)
      photoPath = `/uploads/posts/${file}`
    }
    const r = db.prepare('INSERT OR IGNORE INTO posts (author_id, ripple_partner_id, meeting_id, photo_path, caption) VALUES (?, ?, ?, ?, ?)')
      .run(ctx.me, ctx.other, ctx.m.id, photoPath, parsed.data.caption)
    if (r.changes === 0) {
      res.status(409).json({ error: 'You already posted about this chat.' })
      return
    }
    console.log(`[posts] ${firstName(ctx.me)} posted about coffee with ${firstName(ctx.other)}`)
    res.status(201).json({ id: Number(r.lastInsertRowid) })
  })

  return router
}
