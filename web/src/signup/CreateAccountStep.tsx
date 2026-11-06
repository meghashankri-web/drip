import { useState, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import { api, ApiError, type CreateUserBody } from '../api'
import { errorMessage } from '../hooks'
import { useOnboarding } from '../store/onboarding'
import { useSession } from '../store/session'
import { brand, hardShadow } from '../theme'
import { MEETING_PREF_LABELS } from '../constants'

function Section({ title, step, children }: { title: string; step: number; children: ReactNode }) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="overline" component="h2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
            {title}
          </Typography>
          <Button size="small" component={RouterLink} to={`/signup/${step}`} aria-label={`Edit ${title}`}>
            Edit
          </Button>
        </Stack>
        {children}
      </CardContent>
    </Card>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ py: 0.75 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ overflowWrap: 'anywhere' }}>{children}</Typography>
    </Box>
  )
}

const chipSx = { textTransform: 'none', fontSize: '0.8rem', letterSpacing: 0 } as const

/** Sign-up Step 5: review everything, then create the account. */
export default function CreateAccountStep() {
  const navigate = useNavigate()
  const { basics, resume, interests, personality } = useOnboarding()
  const setCurrentUserId = useSession((s) => s.setCurrentUserId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<{ message: string; step?: number } | null>(null)

  // The page-level guard guarantees earlier steps are complete before this renders.
  if (!resume || !resume.careerStage || !personality.meetingPref) return null

  async function createAccount() {
    if (!resume?.careerStage || !personality.meetingPref || !basics.photoDataUrl || basics.birthYear === null) return
    setSubmitting(true)
    setError(null)
    const body: CreateUserBody = {
      basics: { ...basics, birthYear: basics.birthYear, photoDataUrl: basics.photoDataUrl, is18Plus: true, identifiesAsWoman: true },
      resume: {
        fileId: resume.file?.id ?? null,
        summary: resume.summary,
        experienceTags: resume.experienceTags,
        careerStage: resume.careerStage,
        resumeText: resume.resumeText,
      },
      interests,
      personality: { ...personality, meetingPref: personality.meetingPref },
    }
    try {
      const { id } = await api.createUser(body)
      setCurrentUserId(id)
      // The profile page clears the draft once it has loaded; clearing it here would trip the
      // sign-up step guards and redirect back to Step 1 before navigation finishes.
      navigate('/profile', { replace: true, state: { justSignedUp: true } })
    } catch (e) {
      setError({ message: errorMessage(e), step: e instanceof ApiError ? e.step : undefined })
      setSubmitting(false)
    }
  }

  return (
    <Stack spacing={2.5}>
      <Section title="Basics" step={1}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1 }}>
          <Avatar src={basics.photoDataUrl ?? undefined} alt="" sx={{ width: 64, height: 64, border: 2, borderColor: 'primary.main' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" component="p">{basics.firstName} {basics.lastName}</Typography>
            <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{basics.email}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={3}>
          <Row label="ZIP code">{basics.zip}</Row>
          <Row label="Birth year">{basics.birthYear}</Row>
        </Stack>
        <Row label="Race / Culture">{basics.raceCulture.trim() || 'Not shared'}</Row>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
          <Chip size="small" icon={<CheckIcon />} label="18 or older" />
          <Chip size="small" icon={<CheckIcon />} label="Identifies as a woman" />
        </Stack>
      </Section>

      <Section title="Resume & experience" step={2}>
        <Row label="Resume">{resume.file?.name ?? 'Entered by hand'}</Row>
        <Row label="Career stage">{resume.careerStage}</Row>
        <Row label="Summary">{resume.summary}</Row>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mt: 0.75, mb: 0.75 }}>
          Experience you can offer
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {resume.experienceTags.map((t) => <Chip key={t} label={t} variant="outlined" size="small" sx={chipSx} />)}
        </Box>
      </Section>

      <Section title="Interests" step={3}>
        <Stack component="ol" spacing={0.75} sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {interests.map((t, i) => (
            <Stack component="li" key={t} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 22, height: 22, display: 'grid', placeItems: 'center', borderRadius: 0.5, fontSize: 12, fontWeight: 700,
                color: '#fff', bgcolor: i === 0 ? 'secondary.main' : 'primary.main' }}>{i + 1}</Box>
              <Typography>{t}</Typography>
            </Stack>
          ))}
        </Stack>
      </Section>

      <Section title="Personality & meeting" step={4}>
        <Row label="Hobbies / interests">{personality.hobbies}</Row>
        <Row label="Best advice">{personality.bestAdvice}</Row>
        <Row label="A woman I look up to">{personality.womanAdmired}</Row>
        <Row label="Ask me about">{personality.askMeAbout}</Row>
        <Stack direction="row" spacing={3}>
          <Row label="Meeting preference">{MEETING_PREF_LABELS[personality.meetingPref]}</Row>
          <Row label="Chats per month">{personality.chatsPerMonth}</Row>
        </Stack>
      </Section>

      {error && (
        <Alert
          severity="error"
          variant="outlined"
          sx={{ borderRadius: 1, borderWidth: 2 }}
          action={error.step ? (
            <Button color="inherit" size="small" component={RouterLink} to={`/signup/${error.step}`}>
              Go to step {error.step}
            </Button>
          ) : undefined}
        >
          {error.message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
        <Button component={RouterLink} to="/signup/4" disabled={submitting}>Back</Button>
        <Button
          variant="contained"
          size="large"
          onClick={() => void createAccount()}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ boxShadow: hardShadow(4, brand.terracotta) }}
        >
          {submitting ? 'Creating…' : 'Create account'}
        </Button>
      </Box>
    </Stack>
  )
}
