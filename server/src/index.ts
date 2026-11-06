import 'dotenv/config'
import express from 'express'
import fs from 'node:fs'
import { openDb, UPLOADS_DIR } from './db.js'
import { ensureSeeded } from '../db/seed.js'
import { usersRouter } from './routes/users.js'

fs.mkdirSync(UPLOADS_DIR, { recursive: true })
const db = openDb()
ensureSeeded(db)

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(UPLOADS_DIR))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})
app.use('/api/users', usersRouter(db))

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`Drip API listening on http://localhost:${PORT}`)
})
