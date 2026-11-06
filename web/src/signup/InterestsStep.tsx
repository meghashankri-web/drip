import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Alert, Box, Button, Chip, FormHelperText, IconButton, Skeleton, Stack, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import CloseIcon from '@mui/icons-material/Close'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import { api } from '../api'
import { useOnboarding } from '../store/onboarding'
import { brand, hardShadow } from '../theme'
import { TAG_MAX_LENGTH } from './resume'
import {
  addInterest, FALLBACK_SUGGESTIONS, INTERESTS_MAX, LIMIT_MESSAGE, moveInterest, suggestionKey, visibleSuggestions,
} from './interests'

type SuggestResult = Awaited<ReturnType<typeof api.suggestInterests>>
/** One in-flight request per input key, so remounts (e.g. React Strict Mode) don't call Claude twice. */
const inflight = new Map<string, Promise<SuggestResult>>()
function fetchSuggestions(key: string, body: Parameters<typeof api.suggestInterests>[0]): Promise<SuggestResult> {
  let p = inflight.get(key)
  if (!p) {
    p = api.suggestInterests(body).finally(() => setTimeout(() => inflight.delete(key), 0))
    inflight.set(key, p)
  }
  return p
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Typography variant="overline" component="h2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
      {children}
    </Typography>
  )
}

/** Sign-up Step 3: pick and rank up to 5 things to learn or get help with. */
export default function InterestsStep() {
  const navigate = useNavigate()
  const resume = useOnboarding((s) => s.resume)!
  const interests = useOnboarding((s) => s.interests)
  const setInterests = useOnboarding((s) => s.setInterests)
  const cached = useOnboarding((s) => s.interestSuggestions)
  const setCached = useOnboarding((s) => s.setInterestSuggestions)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Fetch suggestions once per (experience, stage); reuse them on Back/Next.
  const key = suggestionKey(resume)
  const haveSuggestions = cached?.key === key
  useEffect(() => {
    if (haveSuggestions || !resume.careerStage) return
    let cancelled = false
    fetchSuggestions(key, { experienceTags: resume.experienceTags, careerStage: resume.careerStage, summary: resume.summary })
      .then((r) => !cancelled && setCached({ key, items: r.suggestions, source: r.source }))
      .catch(() => !cancelled && setCached({ key, items: FALLBACK_SUGGESTIONS, source: 'static' }))
    return () => {
      cancelled = true
    }
  }, [key, haveSuggestions, resume, setCached])

  const full = interests.length >= INTERESTS_MAX
  const suggestions = haveSuggestions ? visibleSuggestions(cached.items, interests) : []

  function add(raw: string): boolean {
    const result = addInterest(interests, raw)
    if ('error' in result) {
      setError(result.error)
      return false
    }
    setInterests(result.list)
    setError(null)
    return true
  }

  return (
    <Stack spacing={3}>
      <Alert
        icon={false}
        sx={{ bgcolor: brand.foam, color: 'text.primary', border: 2, borderColor: 'primary.main', borderRadius: 1 }}
      >
        Your experience tags were what you <b>offer</b>. Now choose up to {INTERESTS_MAX} things you want to{' '}
        <b>learn or get help with</b>, and put the most important first. We use this order to find your matches.
      </Alert>

      {/* Ranked list */}
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionLabel>Your interests</SectionLabel>
          <Typography variant="body2" color={full ? 'secondary.main' : 'text.secondary'} sx={{ fontWeight: 700 }}>
            {interests.length}/{INTERESTS_MAX}
          </Typography>
        </Stack>
        {interests.length === 0 ? (
          <Box sx={{ border: `2px dashed ${brand.latte}`, borderRadius: 1, p: 2.5, textAlign: 'center' }}>
            <Typography color="text.secondary">Tap a suggestion below or add your own.</Typography>
          </Box>
        ) : (
          <Stack component="ol" aria-label="Your interests, most important first" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {interests.map((tag, i) => (
              <Stack
                component="li"
                key={tag}
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center', bgcolor: '#fff', border: 2, borderColor: 'primary.main', borderRadius: 1,
                  pl: 1.5, pr: 0.5, py: 0.5, boxShadow: i === 0 ? hardShadow(3, brand.terracotta) : 'none',
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 28, height: 28, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 0.5,
                    bgcolor: i === 0 ? 'secondary.main' : 'primary.main', color: '#fff', fontWeight: 700, fontSize: 14,
                  }}
                >
                  {i + 1}
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }} noWrap>{tag}</Typography>
                  {i === 0 && <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 700 }}>Top priority</Typography>}
                </Box>
                <IconButton
                  size="small"
                  aria-label={`Move ${tag} up`}
                  disabled={i === 0}
                  onClick={() => setInterests(moveInterest(interests, i, i - 1))}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`Move ${tag} down`}
                  disabled={i === interests.length - 1}
                  onClick={() => setInterests(moveInterest(interests, i, i + 1))}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`Remove ${tag}`}
                  onClick={() => {
                    setInterests(interests.filter((_, j) => j !== i))
                    setError(null)
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>

      {/* Suggestions */}
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <SectionLabel>Suggestions</SectionLabel>
          {haveSuggestions && cached.source === 'claude' && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <AutoAwesomeOutlinedIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption">from Claude, based on your experience</Typography>
            </Stack>
          )}
        </Stack>
        <Box role="group" aria-label="Suggested interests" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {!haveSuggestions &&
            [92, 120, 80, 140, 100, 110].map((w, i) => (
              <Skeleton key={i} variant="rounded" width={w} height={32} sx={{ borderRadius: 1 }} />
            ))}
          {haveSuggestions && suggestions.length === 0 && (
            <Typography variant="body2" color="text.secondary">You’ve added all of our suggestions.</Typography>
          )}
          {suggestions.map((s) => (
            <Chip
              key={s}
              label={s}
              icon={<AddIcon />}
              variant="outlined"
              onClick={() => add(s)}
              aria-label={`Add ${s}`}
              aria-disabled={full}
              sx={{ textTransform: 'none', fontSize: '0.8rem', letterSpacing: 0, opacity: full ? 0.5 : 1 }}
            />
          ))}
        </Box>
      </Stack>

      {/* Custom */}
      <Stack spacing={1}>
        <SectionLabel>Add your own</SectionLabel>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            fullWidth
            placeholder="e.g. Salary Negotiation"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (add(draft)) setDraft('')
              }
            }}
            slotProps={{ htmlInput: { 'aria-label': 'New interest', maxLength: TAG_MAX_LENGTH + 10 } }}
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            sx={{ flexShrink: 0 }}
            onClick={() => {
              if (add(draft)) setDraft('')
            }}
          >
            Add
          </Button>
        </Stack>
        {(error || full) && (
          <FormHelperText error={!!error} sx={{ m: 0, fontWeight: error ? 600 : 400 }}>
            {error ?? LIMIT_MESSAGE}
          </FormHelperText>
        )}
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button component={RouterLink} to="/signup/2">Back</Button>
        <Button variant="contained" disabled={interests.length === 0} onClick={() => navigate('/signup/4')}>
          Next
        </Button>
      </Box>
    </Stack>
  )
}
