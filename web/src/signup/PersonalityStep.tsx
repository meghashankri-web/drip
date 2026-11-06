import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, Button, FormHelperText, Slider, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import type { MeetingPref } from '../api'
import { useOnboarding, type PersonalityDraft } from '../store/onboarding'
import { brand, hardShadow } from '../theme'
import { ANSWER_MAX, CHATS_MAX, CHATS_MIN, clampChats, validatePersonality } from './personality'

type AnswerField = 'hobbies' | 'bestAdvice' | 'womanAdmired' | 'askMeAbout'

const QUESTIONS: { field: AnswerField; label: string; placeholder: string; multiline?: boolean }[] = [
  { field: 'hobbies', label: 'What are some of your hobbies/interests?', placeholder: 'e.g. Pottery, trail running, and hunting for the best chai in town' },
  { field: 'bestAdvice', label: 'What is the best piece of advice you have given or received?', placeholder: 'e.g. Ask the question everyone else is too nervous to ask.', multiline: true },
  { field: 'womanAdmired', label: 'A woman you look up to', placeholder: 'e.g. Dolores Huerta, my grandmother, my first manager' },
  { field: 'askMeAbout', label: 'Ask me about…', placeholder: 'e.g. Switching careers into tech' },
]

const MEETING_OPTIONS: { value: MeetingPref; label: string; icon: React.ReactNode }[] = [
  { value: 'in_person', label: 'In person', icon: <LocalCafeOutlinedIcon /> },
  { value: 'zoom', label: 'Zoom', icon: <VideocamOutlinedIcon /> },
  { value: 'either', label: 'Either', icon: <SwapHorizIcon /> },
]

const SLIDER_MARKS = Array.from({ length: CHATS_MAX - CHATS_MIN + 1 }, (_, i) => ({ value: i + CHATS_MIN, label: String(i + CHATS_MIN) }))

function SectionLabel({ children }: { children: string }) {
  return (
    <Typography variant="overline" component="h2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
      {children}
    </Typography>
  )
}

/** Sign-up Step 4: personality questions, how she likes to meet, and how often. */
export default function PersonalityStep() {
  const navigate = useNavigate()
  const personality = useOnboarding((s) => s.personality)
  const setPersonality = useOnboarding((s) => s.setPersonality)
  const [touched, setTouched] = useState<Partial<Record<keyof PersonalityDraft, boolean>>>({})
  const errors = useMemo(() => validatePersonality(personality), [personality])
  const isValid = Object.keys(errors).length === 0
  const show = (f: keyof PersonalityDraft) => !!touched[f] && !!errors[f]
  const chats = clampChats(personality.chatsPerMonth)

  return (
    <Stack
      component="form"
      noValidate
      spacing={3}
      onSubmit={(e) => {
        e.preventDefault()
        if (isValid) navigate('/signup/5')
      }}
    >
      <Stack spacing={2.5}>
        <SectionLabel>Get to know you</SectionLabel>
        {QUESTIONS.map((q) => {
          const value = personality[q.field]
          return (
            <Stack key={q.field} spacing={0.75}>
            <Typography component="label" htmlFor={`q-${q.field}`} sx={{ fontWeight: 600 }}>
              {q.label}
            </Typography>
            <TextField
              id={`q-${q.field}`}
              placeholder={q.placeholder}
              value={value}
              multiline={q.multiline}
              minRows={q.multiline ? 2 : undefined}
              onChange={(e) => setPersonality({ [q.field]: e.target.value.slice(0, ANSWER_MAX) })}
              onBlur={() => setTouched((t) => ({ ...t, [q.field]: true }))}
              error={show(q.field)}
              helperText={show(q.field) ? errors[q.field] : value.length >= ANSWER_MAX - 40 ? `${value.length}/${ANSWER_MAX}` : ' '}
              fullWidth
              slotProps={{ htmlInput: { maxLength: ANSWER_MAX } }}
            />
            </Stack>
          )
        })}
      </Stack>

      <Stack spacing={1.5}>
        <SectionLabel>How do you like to meet?</SectionLabel>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={personality.meetingPref}
          onChange={(_e, v: MeetingPref | null) => {
            if (v) setPersonality({ meetingPref: v })
            setTouched((t) => ({ ...t, meetingPref: true }))
          }}
          aria-label="Meeting preference"
          sx={{
            gap: 1,
            '& .MuiToggleButton-root': {
              flexDirection: 'column', gap: 0.5, py: 1.5, border: `2px solid ${brand.espresso} !important`,
              borderRadius: '4px !important', bgcolor: '#fff', color: 'text.primary', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem',
            },
            '& .MuiToggleButton-root.Mui-selected': {
              bgcolor: brand.espresso, color: brand.cream, boxShadow: hardShadow(3, brand.terracotta),
              '&:hover': { bgcolor: brand.espressoLight },
            },
          }}
        >
          {MEETING_OPTIONS.map((o) => (
            <ToggleButton key={o.value} value={o.value} aria-label={o.label}>
              {o.icon}
              {o.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {show('meetingPref') && <FormHelperText error sx={{ m: 0 }}>{errors.meetingPref}</FormHelperText>}
      </Stack>

      <Stack spacing={1}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionLabel>Coffee chats per month</SectionLabel>
          <Typography variant="h5" component="p" aria-hidden sx={{ color: 'secondary.main' }}>{chats}</Typography>
        </Stack>
        <Box sx={{ px: 1.5 }}>
          <Slider
            value={chats}
            min={CHATS_MIN}
            max={CHATS_MAX}
            step={1}
            marks={SLIDER_MARKS}
            onChange={(_e, v) => setPersonality({ chatsPerMonth: clampChats(v) })}
            getAriaValueText={(v) => `${v} chats per month`}
            slotProps={{ input: { 'aria-label': 'Coffee chats per month' } }}
            sx={{
              color: brand.espresso,
              '& .MuiSlider-thumb': { borderRadius: 0.5, width: 22, height: 22, boxShadow: hardShadow(2, brand.terracotta) },
              '& .MuiSlider-rail': { opacity: 1, bgcolor: brand.latte },
            }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">You can change this any time.</Typography>
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button component={RouterLink} to="/signup/3">Back</Button>
        <Button type="submit" variant="contained" disabled={!isValid}>Next</Button>
      </Box>
    </Stack>
  )
}
