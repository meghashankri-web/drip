import { useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Alert, Avatar, Box, Button, Stack, TextField, Typography } from '@mui/material'
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined'
import { api, type InboxMessage } from '../api'
import { errorMessage } from '../hooks'
import { PHOTO_ACCEPT, prepareProfilePhoto } from '../signup/photo'
import { brand } from '../theme'

/** Post-meeting prompt: mandatory "did it happen?", then an optional photo + kind words. */
export default function PromptBody({ prompt, onChanged }: { prompt: NonNullable<InboxMessage['prompt']>; onChanged: () => void }) {
  const [mode, setMode] = useState<'ask' | 'no'>('ask')
  const [explanation, setExplanation] = useState('')
  const [caption, setCaption] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justRippled, setJustRippled] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const name = prompt.other.firstName

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onChanged()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (prompt.answer === null) {
    return (
      <Stack spacing={1.5} sx={{ mt: 1 }} data-testid="prompt">
        <Typography sx={{ fontWeight: 700 }}>Did your coffee chat with {name} happen?</Typography>
        {mode === 'ask' ? (
          <Stack direction="row" spacing={1}>
            <Button variant="contained" disabled={busy}
              onClick={() => void run(async () => setJustRippled((await api.confirmMeeting(prompt.meetingId, { happened: true })).rippleCount))}>
              Yes
            </Button>
            <Button variant="outlined" disabled={busy} onClick={() => setMode('no')}>No</Button>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <TextField label="What happened?" placeholder="e.g. We had to reschedule" value={explanation}
              onChange={(e) => setExplanation(e.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 300, 'aria-label': 'Explanation' } }} />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" disabled={busy || !explanation.trim()}
                onClick={() => void run(() => api.confirmMeeting(prompt.meetingId, { happened: false, explanation: explanation.trim() }))}>
                Submit
              </Button>
              <Button onClick={() => setMode('ask')}>Back</Button>
            </Stack>
          </Stack>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    )
  }

  if (prompt.answer === 'no') return <Typography sx={{ mt: 1 }} color="text.secondary">Thanks for letting us know.</Typography>

  return (
    <Stack spacing={1.5} sx={{ mt: 1 }} data-testid="prompt">
      <Box sx={{ p: 1.5, bgcolor: brand.espresso, color: brand.cream }}>
        <Typography sx={{ fontWeight: 700 }} data-testid="ripple-made">
          🌊 You and {name} made a ripple!{justRippled !== null ? ` You now have ${justRippled} ${justRippled === 1 ? 'ripple' : 'ripples'}.` : ''}
        </Typography>
      </Box>
      {prompt.posted ? (
        <Typography variant="body2">
          Posted! See it on your <Box component={RouterLink} to="/profile?tab=posts" sx={{ color: 'inherit', fontWeight: 700 }}>profile</Box>.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>Share a photo and some kind words (optional)</Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Avatar variant="rounded" src={photo ?? undefined} sx={{ width: 64, height: 64, bgcolor: brand.foam, color: brand.espresso }}>
              <AddAPhotoOutlinedIcon />
            </Avatar>
            <Button size="small" variant="outlined" onClick={() => fileInput.current?.click()}>{photo ? 'Change photo' : 'Add photo'}</Button>
            <input ref={fileInput} type="file" hidden accept={PHOTO_ACCEPT} data-testid="post-photo"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) prepareProfilePhoto(f).then(setPhoto).catch((x: Error) => setError(x.message)) }} />
          </Stack>
          <TextField placeholder={`What did ${name} teach you?`} value={caption} onChange={(e) => setCaption(e.target.value)}
            multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500, 'aria-label': 'Kind words' } }} />
          <Button variant="contained" sx={{ alignSelf: 'flex-start' }} disabled={busy || !caption.trim()}
            onClick={() => void run(() => api.createPost(prompt.meetingId, { caption: caption.trim(), photoDataUrl: photo }))}>
            Post
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      )}
    </Stack>
  )
}
