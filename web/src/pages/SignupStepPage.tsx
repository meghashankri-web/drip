import { Link as RouterLink, useParams } from 'react-router-dom'
import { Button, Card, CardContent, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material'
import NotFoundPage from './NotFoundPage'
import { SIGNUP_STEPS } from '../constants'

const STEP_INFO: Record<number, { title: string; buildStep: number }> = {
  1: { title: 'Tell us about you', buildStep: 3 },
  2: { title: 'Your resume & experience', buildStep: 4 },
  3: { title: 'What do you want to explore?', buildStep: 5 },
  4: { title: 'Personality & meeting preferences', buildStep: 6 },
  5: { title: 'Review & create account', buildStep: 7 },
}

/** Placeholder for each sign-up step; each one is built out in Steps 3–7. */
export default function SignupStepPage() {
  const step = Number(useParams().step)
  const info = STEP_INFO[step]
  if (!info) return <NotFoundPage />

  return (
    <Stack spacing={3}>
      <Stepper activeStep={step - 1} alternativeLabel>
        {SIGNUP_STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Typography variant="overline" color="text.secondary" sx={{ textAlign: 'center' }}>
        Step {step} of {SIGNUP_STEPS.length}
      </Typography>
      <Typography variant="h4" component="h1" sx={{ textAlign: 'center' }}>
        {info.title}
      </Typography>
      <Card>
        <CardContent>
          <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
            This form is coming in build Step {info.buildStep}.
          </Typography>
        </CardContent>
      </Card>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Button component={RouterLink} to={step === 1 ? '/feed' : `/signup/${step - 1}`}>
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        {step < SIGNUP_STEPS.length && (
          <Button variant="contained" component={RouterLink} to={`/signup/${step + 1}`}>
            Next
          </Button>
        )}
      </Stack>
    </Stack>
  )
}
