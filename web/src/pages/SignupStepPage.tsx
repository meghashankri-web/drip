import { Link as RouterLink, Navigate, useParams } from 'react-router-dom'
import { Box, Button, Card, CardContent, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material'
import type { StepIconProps } from '@mui/material/StepIcon'
import CheckIcon from '@mui/icons-material/Check'
import { brand } from '../theme'
import NotFoundPage from './NotFoundPage'
import BasicsStep from '../signup/BasicsStep'
import ResumeStep from '../signup/ResumeStep'
import InterestsStep from '../signup/InterestsStep'
import PersonalityStep from '../signup/PersonalityStep'
import CreateAccountStep from '../signup/CreateAccountStep'
import { validatePersonality } from '../signup/personality'
import { isBasicsFilled, isResumeComplete } from '../signup/resume'
import { useOnboarding } from '../store/onboarding'
import { SIGNUP_STEPS } from '../constants'

const STEP_INFO: Record<number, { title: string; subtitle?: string; buildStep: number }> = {
  1: { title: 'Tell us about you', subtitle: 'The basics, so other members know who they’re meeting.', buildStep: 3 },
  2: { title: 'Your resume & experience', subtitle: 'Upload your resume and Claude will draft your profile. You stay in control of every word.', buildStep: 4 },
  3: { title: 'What do you want to explore or get help with?', buildStep: 5 },
  4: { title: 'Personality & meeting preferences', subtitle: 'A little about you, and how you like to meet.', buildStep: 6 },
  5: { title: 'Review & create account', subtitle: 'Check everything looks right. You can edit any section.', buildStep: 7 },
}

/** Square step marker to match Drip's sharp-edged style. */
function SquareStepIcon({ active, completed, icon }: StepIconProps) {
  const filled = active || completed
  return (
    <Box
      sx={{
        width: 26, height: 26, borderRadius: 0.5, display: 'grid', placeItems: 'center',
        fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
        border: `2px solid ${filled ? brand.espresso : '#b9a993'}`,
        bgcolor: completed ? brand.espresso : active ? brand.terracotta : 'transparent',
        color: filled ? '#fff' : '#8a7763',
      }}
    >
      {completed ? <CheckIcon sx={{ fontSize: 16 }} /> : icon}
    </Box>
  )
}

/** Placeholder body + Back/Next for sign-up steps that later build steps fill in. */
function ComingSoon({ step, buildStep }: { step: number; buildStep: number }) {
  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
            This form is coming in build Step {buildStep}.
          </Typography>
        </CardContent>
      </Card>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Button component={RouterLink} to={`/signup/${step - 1}`}>Back</Button>
        {step < SIGNUP_STEPS.length && (
          <Button variant="contained" component={RouterLink} to={`/signup/${step + 1}`}>Next</Button>
        )}
      </Stack>
    </Stack>
  )
}

/** /signup/:step — stepper, heading, and the step's form. */
export default function SignupStepPage() {
  const step = Number(useParams().step)
  const info = STEP_INFO[step]
  const basics = useOnboarding((s) => s.basics)
  const resume = useOnboarding((s) => s.resume)
  const interestCount = useOnboarding((s) => s.interests.length)
  const personality = useOnboarding((s) => s.personality)
  if (!info) return <NotFoundPage />
  // Deep links skip ahead only as far as the steps already completed.
  if (step >= 2 && !isBasicsFilled(basics)) return <Navigate to="/signup/1" replace />
  if (step >= 3 && !isResumeComplete(resume)) return <Navigate to="/signup/2" replace />
  if (step >= 4 && interestCount === 0) return <Navigate to="/signup/3" replace />
  if (step >= 5 && Object.keys(validatePersonality(personality)).length > 0) return <Navigate to="/signup/4" replace />

  return (
    <Stack spacing={3}>
      <Stepper activeStep={step - 1} alternativeLabel>
        {SIGNUP_STEPS.map((label) => (
          <Step key={label}>
            <StepLabel slots={{ stepIcon: SquareStepIcon }}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Stack spacing={1} sx={{ textAlign: 'center' }}>
        <Typography variant="overline" color="text.secondary">
          Step {step} of {SIGNUP_STEPS.length}
        </Typography>
        <Typography variant="h4" component="h1">
          {info.title}
        </Typography>
        {info.subtitle && <Typography color="text.secondary">{info.subtitle}</Typography>}
      </Stack>
      {step === 1 ? <BasicsStep /> : step === 2 ? <ResumeStep /> : step === 3 ? <InterestsStep /> : step === 4 ? <PersonalityStep /> : step === 5 ? <CreateAccountStep /> : (
        <ComingSoon step={step} buildStep={info.buildStep} />
      )}
    </Stack>
  )
}
