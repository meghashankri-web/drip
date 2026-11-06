import { openDb } from '../src/db.js'
import { resetDatabase } from './seed.js'

const db = openDb()
resetDatabase(db)

const count = (table: string) => (db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n
console.log(
  `Database reset: ${count('users')} users, ${count('ripples')} ripples, ${count('posts')} posts, ` +
    `${count('cheers')} cheers, ${count('zip_locations')} ZIP codes.`,
)
db.close()
