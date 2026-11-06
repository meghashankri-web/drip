import { Router, type ErrorRequestHandler } from 'express'
import multer from 'multer'
import mammoth from 'mammoth'
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { UPLOADS_DIR } from '../db.js'
import { AnalysisError, analyzeResume, type ResumeInput } from '../claude.js'

const execFileAsync = promisify(execFile)

export const RESUME_MAX_BYTES = 5 * 1024 * 1024
export const RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'] as const
type ResumeExt = (typeof RESUME_EXTENSIONS)[number]
export const RESUMES_DIR = path.join(UPLOADS_DIR, 'resumes')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: RESUME_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if ((RESUME_EXTENSIONS as readonly string[]).includes(ext)) cb(null, true)
    else cb(new AnalysisError(415, 'bad_type', 'Please upload a PDF, Word (.doc or .docx), or .txt file.'))
  },
})

/** Pulls plain text out of a Word or text file, or passes a PDF through for Claude to read directly. */
async function toResumeInput(ext: ResumeExt, buffer: Buffer): Promise<ResumeInput> {
  if (ext === '.pdf') {
    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new AnalysisError(422, 'unreadable', 'That file doesn’t look like a valid PDF.')
    }
    return { kind: 'pdf', base64: buffer.toString('base64') }
  }

  let text: string
  if (ext === '.txt') {
    text = buffer.toString('utf8')
  } else if (ext === '.docx') {
    try {
      text = (await mammoth.extractRawText({ buffer })).value
    } catch {
      throw new AnalysisError(422, 'unreadable', 'We couldn’t open that Word document. Try saving it as a PDF.')
    }
  } else {
    // Legacy .doc: mammoth can't read it, so use macOS's built-in converter.
    text = await docToText(buffer)
  }

  text = text.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (text.length < 50) {
    throw new AnalysisError(422, 'empty', 'We couldn’t find much text in that file. Is it the right resume?')
  }
  return { kind: 'text', text }
}

async function docToText(buffer: Buffer): Promise<string> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'drip-doc-'))
  const input = path.join(dir, 'resume.doc')
  const output = path.join(dir, 'resume.txt')
  try {
    await fs.promises.writeFile(input, buffer)
    await execFileAsync('/usr/bin/textutil', ['-convert', 'txt', '-output', output, input], { timeout: 20_000 })
    return await fs.promises.readFile(output, 'utf8')
  } catch {
    throw new AnalysisError(422, 'unreadable', 'We couldn’t open that .doc file. Try saving it as .docx or PDF.')
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true })
  }
}

export function resumeRouter(): Router {
  const router = Router()

  /**
   * POST /api/resume/analyze (multipart, field "resume").
   * Saves the file (Step 7 links it to the new account) and returns Claude's analysis.
   */
  router.post('/analyze', upload.single('resume'), async (req, res, next) => {
    try {
      const file = req.file
      if (!file) throw new AnalysisError(400, 'no_file', 'Please choose a resume to upload.')
      const ext = path.extname(file.originalname).toLowerCase() as ResumeExt

      const input = await toResumeInput(ext, file.buffer)
      const analysis = await analyzeResume(input)

      const fileId = `${randomUUID()}${ext}`
      await fs.promises.mkdir(RESUMES_DIR, { recursive: true })
      await fs.promises.writeFile(path.join(RESUMES_DIR, fileId), file.buffer)

      res.json({ ...analysis, file: { id: fileId, name: file.originalname } })
    } catch (error) {
      next(error)
    }
  })

  return router
}

/** Turns upload and analysis failures into friendly JSON errors. */
export const resumeErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'That file is over 5 MB. Please upload a smaller resume.'
        : 'We couldn’t accept that upload. Please try again.'
    res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: message, code: error.code })
    return
  }
  if (error instanceof AnalysisError) {
    res.status(error.status).json({ error: error.message, code: error.code })
    return
  }
  next(error)
}
