import { Router } from 'express'
import type { DB } from '../db.js'

export function zipsRouter(db: DB): Router {
  const router = Router()
  const getZip = db.prepare('SELECT zip, city, state FROM zip_locations WHERE zip = ?')

  /** Looks up a US ZIP code. 404 if it isn't in the dataset. */
  router.get('/:zip', (req, res) => {
    const zip = req.params.zip
    if (!/^\d{5}$/.test(zip)) {
      res.status(400).json({ error: 'ZIP code must be 5 digits' })
      return
    }
    const row = getZip.get(zip) as { zip: string; city: string; state: string } | undefined
    if (!row) {
      res.status(404).json({ error: 'ZIP code not found' })
      return
    }
    res.json(row)
  })

  return router
}
