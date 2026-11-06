import { Router } from 'express'
import { z } from 'zod'
import type { DB } from '../db.js'
import { getViewerId } from '../viewer.js'

type MessageRow = {
  id: number; type: string; ref_id: number | null; body: string; read_at: string | null; created_at: string
  from_id: number | null; from_first: string | null; from_last: string | null; from_photo: string | null
}
type RequestRow = {
  id: number; from_user_id: number; to_user_id: number; message: string; availability: string; status: string
  rematch_after: string | null; created_at: string
}
type MeetingRow = { id: number; request_id: number; datetime: string; location: string }

const Respond = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept'), datetime: z.string().datetime({ offset: true }), location: z.string().trim().min(1).max(300) }),
  z.object({ action: z.literal('not_now') }),
  z.object({ action: z.literal('decline') }),
])

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })

export function messagesRouter(db: DB): Router {
  const router = Router()
  const list = db.prepare(`
    SELECT m.id, m.type, m.ref_id, m.body, m.read_at, m.created_at,
      u.id AS from_id, u.first_name AS from_first, u.last_name AS from_last, u.photo_path AS from_photo
    FROM messages m LEFT JOIN users u ON u.id = m.from_user_id
    WHERE m.to_user_id = ? ORDER BY m.created_at DESC, m.id DESC`)
  const getRequest = db.prepare('SELECT * FROM chat_requests WHERE id = ?')
  const getMeeting = db.prepare('SELECT id, request_id, datetime, location FROM meetings WHERE id = ?')
  const meetingForRequest = db.prepare('SELECT id, request_id, datetime, location FROM meetings WHERE request_id = ?')
  const userName = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?')

  /** GET /api/messages — the viewer's inbox, newest first, with the request / meeting each one refers to. */
  router.get('/', (req, res) => {
    const me = getViewerId(req)
    if (me === null) {
      res.status(401).json({ error: 'Choose a profile first.' })
      return
    }
    const rows = list.all(me) as MessageRow[]
    res.json(rows.map((m) => {
      let request: unknown = null
      let meeting: unknown = null
      if (m.type === 'chat_request' && m.ref_id) {
        const r = getRequest.get(m.ref_id) as RequestRow | undefined
        if (r) {
          request = { id: r.id, status: r.status, message: r.message, availability: JSON.parse(r.availability), createdAt: r.created_at }
          const mt = meetingForRequest.get(r.id) as MeetingRow | undefined
          if (mt) meeting = { id: mt.id, datetime: mt.datetime, location: mt.location }
        }
      }
      if (m.type === 'accepted' && m.ref_id) {
        const mt = getMeeting.get(m.ref_id) as MeetingRow | undefined
        if (mt) meeting = { id: mt.id, datetime: mt.datetime, location: mt.location }
      }
      return {
        id: m.id, type: m.type, body: m.body, readAt: m.read_at, createdAt: m.created_at,
        from: m.from_id ? { id: m.from_id, firstName: m.from_first, lastName: m.from_last, photoUrl: m.from_photo } : null,
        request, meeting,
      }
    }))
  })

  const markAllRead = db.prepare(`UPDATE messages SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE to_user_id = ? AND read_at IS NULL`)
  router.post('/read-all', (req, res) => {
    const me = getViewerId(req)
    if (me !== null) markAllRead.run(me)
    res.json({ ok: true })
  })

  const setStatus = db.prepare('UPDATE chat_requests SET status = ?, rematch_after = ? WHERE id = ?')
  const insertMeeting = db.prepare('INSERT INTO meetings (request_id, datetime, location) VALUES (?, ?, ?)')
  const insertMessage = db.prepare('INSERT INTO messages (to_user_id, from_user_id, type, ref_id, body) VALUES (?, ?, ?, ?, ?)')

  /** POST /api/messages/requests/:id/respond { action: accept|not_now|decline, datetime?, location? } — recipient only. */
  router.post('/requests/:id/respond', (req, res) => {
    const me = getViewerId(req)
    const r = getRequest.get(Number(req.params.id)) as RequestRow | undefined
    if (!r || me === null || r.to_user_id !== me) {
      res.status(404).json({ error: 'Request not found.' })
      return
    }
    if (r.status !== 'pending') {
      res.status(409).json({ error: 'You’ve already responded to this request.' })
      return
    }
    const parsed = Respond.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Choose a date, time and place to accept.' })
      return
    }
    const me_ = userName.get(me) as { first_name: string }
    const body = parsed.data
    const result = db.transaction(() => {
      if (body.action === 'accept') {
        setStatus.run('accepted', null, r.id)
        const meetingId = Number(insertMeeting.run(r.id, body.datetime, body.location).lastInsertRowid)
        insertMessage.run(r.from_user_id, me, 'accepted', meetingId,
          `${me_.first_name} accepted your coffee chat! ☕ ${fmt(body.datetime)} · ${body.location}`)
        return { status: 'accepted', meetingId }
      }
      if (body.action === 'not_now') {
        const rematch = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        setStatus.run('not_now', rematch, r.id)
        insertMessage.run(r.from_user_id, null, 'not_now', r.id,
          `${me_.first_name} is busy right now, so she can’t meet this month. Drip will circle back in a month. 💛`)
        return { status: 'not_now' }
      }
      setStatus.run('declined', null, r.id)
      insertMessage.run(r.from_user_id, null, 'declined', r.id,
        `Thank you for reaching out! ${me_.first_name} isn’t able to meet, but there are lots of women on Drip excited to connect. Keep exploring your feed.`)
      return { status: 'declined' }
    })()
    console.log(`[requests] #${r.id} -> ${result.status}`)
    res.json(result)
  })

  return router
}
