import 'dotenv/config'
import express from 'express'
import fs from 'node:fs'
import { openDb, UPLOADS_DIR } from './db.js'
import { ensureSeeded } from '../db/seed.js'
import { usersRouter } from './routes/users.js'
import { zipsRouter } from './routes/zips.js'
import { resumeErrorHandler, resumeRouter } from './routes/resume.js'
import { interestsRouter } from './routes/interests.js'

fs.mkdirSync(UPLOADS_DIR, { recursive: true })
const db = openDb()
ensureSeeded(db)

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(express.json({ limit: '4mb' })) // sign-up sends the profile photo as a data URL
app.use('/uploads', express.static(UPLOADS_DIR))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})
app.use('/api/users', usersRouter(db))
app.use('/api/zips', zipsRouter(db))
app.use('/api/resume', resumeRouter(), resumeErrorHandler)
app.use('/api/interests', interestsRouter(db))

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`Drip API listening on http://localhost:${PORT}`)
})
