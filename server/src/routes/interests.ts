import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import type { DB } from '../db.js'
import { CAREER_STAGES, dedupeTags } from '../claude.js'

/** Suggestions are a small, latency-sensitive call: use the faster model (requirements decision #5). */
export const SUGGEST_MODEL = 'claude-sonnet-5-5'
const SUGGESTION_COUNT = 10

const SuggestRequest = z.object({
  experienceTags: z.array(z.string().min(1).max(40)).max(15),
  careerStage: z.enum(CAREER_STAGES),
  summary: z.string().max(800).optional(),
})
type SuggestRequest = z.infer<typeof SuggestRequest>

const SuggestionsSchema = z.object({ suggestions: z.array(z.string()) })

/** Growth topics most members at each stage ask about. Used as the fallback list. */
const STAGE_DEFAULTS: Record<(typeof CAREER_STAGES)[number], string[]> = {
  Student: ['Career Transitions', 'Public Speaking', 'Negotiation', 'Product Management', 'Leadership', 'Startups', 'Data Science', 'Mentorship'],
  'Early career': ['Leadership', 'Negotiation', 'Public Speaking', 'Product Management', 'Career Transitions', 'Fundraising', 'Mentorship', 'Entrepreneurship'],
  'Mid-career': ['Leadership', 'Negotiation', 'Entrepreneurship', 'Public Speaking', 'Board Service', 'Fundraising', 'Career Transitions', 'Venture Capital'],
  Senior: ['Entrepreneurship', 'Leadership', 'Board Service', 'Venture Capital', 'Public Speaking', 'Fundraising', 'Climate Tech', 'Mentorship'],
  Executive: ['Board Service', 'Nonprofit Leadership', 'Climate Tech', 'Mentorship', 'Writing', 'Venture Capital', 'Restorative Justice', 'Entrepreneurship'],
  Founder: ['Fundraising', 'Hiring', 'Operations', 'Marketing', 'Board Service', 'Negotiation', 'Machine Learning', 'Finance'],
}

let client: Anthropic | null = null
function getClient(): Anthropic {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 20_000, maxRetries: 1 })
  return client
}

/** Rule-based suggestions: stage defaults first, then popular community experience, minus what she already has. */
export function staticSuggestions(req: SuggestRequest, communityTags: string[]): string[] {
  const own = new Set(req.experienceTags.map((t) => t.toLowerCase()))
  return dedupeTags([...STAGE_DEFAULTS[req.careerStage], ...communityTags])
    .filter((t) => !own.has(t.toLowerCase()))
    .slice(0, SUGGESTION_COUNT)
}

async function claudeSuggestions(req: SuggestRequest, communityTags: string[]): Promise<string[]> {
  const prompt = `A woman is joining Drip, an app for coffee chats between women. She has listed the experience she can OFFER others; now she picks up to 5 topics she wants to LEARN or get help with. Suggest ${SUGGESTION_COUNT} topics she would likely want to explore next.

Her career stage: ${req.careerStage}
Her experience (what she offers): ${req.experienceTags.join(', ') || '(none listed)'}
${req.summary ? `Her summary: ${req.summary}\n` : ''}
Experience other Drip members can offer (most common first):
${communityTags.join(', ')}

Guidelines:
- Suggest growth areas and next steps for someone at her stage with her background, not things she already does well.
- Prefer topics from the members' list when they fit, so she gets matched with someone who can help; it's fine to include a few others.
- Each suggestion is 1-3 words in Title Case, like the members' list.
- No duplicates and nothing already in her experience.`

  const response = await getClient().beta.messages.parse({
    model: SUGGEST_MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort: 'low', format: betaZodOutputFormat(SuggestionsSchema) },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  })
  if (response.stop_reason === 'refusal' || !response.parsed_output) throw new Error(`no suggestions (${response.stop_reason})`)
  const own = new Set(req.experienceTags.map((t) => t.toLowerCase()))
  return dedupeTags(response.parsed_output.suggestions)
    .filter((t) => !own.has(t.toLowerCase()))
    .slice(0, SUGGESTION_COUNT)
}

export function interestsRouter(db: DB): Router {
  const router = Router()
  const popularExperience = db.prepare(`
    SELECT tag, count(*) AS n FROM experience_tags GROUP BY lower(tag) ORDER BY n DESC, tag LIMIT 60`)

  /**
   * POST /api/interests/suggest  { experienceTags, careerStage, summary? }
   * -> { suggestions: string[], source: 'claude' | 'static' }
   * Falls back to a rule-based list if Claude is unavailable, so sign-up never blocks on it.
   */
  router.post('/suggest', async (req, res) => {
    const parsed = SuggestRequest.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'experienceTags and careerStage are required' })
      return
    }
    const communityTags = (popularExperience.all() as { tag: string }[]).map((r) => r.tag)

    if (process.env.ANTHROPIC_API_KEY) {
      const started = Date.now()
      try {
        const suggestions = await claudeSuggestions(parsed.data, communityTags)
        console.log(`[interests] ${SUGGEST_MODEL} ${suggestions.length} suggestions in ${((Date.now() - started) / 1000).toFixed(1)}s`)
        if (suggestions.length >= 3) {
          res.json({ suggestions, source: 'claude' })
          return
        }
      } catch (error) {
        const detail = error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : String(error)
        console.warn('[interests] Claude suggestions failed, using static list:', detail)
      }
    }
    res.json({ suggestions: staticSuggestions(parsed.data, communityTags), source: 'static' })
  })

  return router
}
