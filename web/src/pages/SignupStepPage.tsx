import { Link as RouterLink, useParams } from 'react-router-dom'
import { Box, Button, Card, CardContent, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material'
import type { StepIconProps } from '@mui/material/StepIcon'
import CheckIcon from '@mui/icons-material/Check'
import { brand } from '../theme'
import NotFoundPage from './NotFoundPage'
import BasicsStep from '../signup/BasicsStep'
import { SIGNUP_STEPS } from '../constants'

const STEP_INFO: Record<number, { title: string; subtitle?: string; buildStep: number }> = {
  1: { title: 'Tell us about you', subtitle: 'The basics, so other members know who they’re meeting.', buildStep: 3 },
  2: { title: 'Your resume & experience', buildStep: 4 },
  3: { title: 'What do you want to explore?', buildStep: 5 },
  4: { title: 'Personality & meeting preferences', buildStep: 6 },
  5: { title: 'Review & create account', buildStep: 7 },
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
  if (!info) return <NotFoundPage />

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
      {step === 1 ? <BasicsStep /> : <ComingSoon step={step} buildStep={info.buildStep} />}
    </Stack>
  )
}
