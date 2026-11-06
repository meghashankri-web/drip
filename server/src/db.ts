import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

export type DB = Database.Database

export const SERVER_ROOT = path.resolve(import.meta.dirname, '..')
export const DB_PATH = path.join(SERVER_ROOT, 'drip.db')
export const UPLOADS_DIR = path.join(SERVER_ROOT, 'uploads')
const SCHEMA_PATH = path.join(SERVER_ROOT, 'db', 'schema.sql')

/** Opens the SQLite file and applies the (idempotent) schema. */
export function openDb(file: string = DB_PATH): DB {
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'))
  return db
}
