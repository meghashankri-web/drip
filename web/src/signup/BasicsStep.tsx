import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Alert, Avatar, Box, Button, Card, CardContent, Checkbox, CircularProgress, FormControlLabel, FormHelperText,
  IconButton, InputAdornment, MenuItem, Stack, TextField, Typography,
} from '@mui/material'
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import { api, ApiError } from '../api'
import { useOnboarding, type BasicsDraft } from '../store/onboarding'
import { brand, hardShadow } from '../theme'
import { PHOTO_ACCEPT, prepareProfilePhoto } from './photo'
import {
  birthYearOptions, isEmailWellFormed, validateBasics, type EmailStatus, type ZipStatus,
} from './validation'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = birthYearOptions(CURRENT_YEAR)

/** Looks up a 5-digit ZIP on the server so we can show the city and reject unknown ZIPs. */
function useZipLookup(zip: string) {
  const [result, setResult] = useState<{ zip: string; status: ZipStatus; place?: string }>({ zip: '', status: 'idle' })
  useEffect(() => {
    if (!/^\d{5}$/.test(zip)) return
    let cancelled = false
    api
      .lookupZip(zip)
      .then((z) => !cancelled && setResult({ zip, status: 'valid', place: `${z.city}, ${z.state}` }))
      .catch((e: unknown) => {
        if (cancelled) return
        setResult({ zip, status: e instanceof ApiError && e.status === 404 ? 'not_found' : 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [zip])
  if (!/^\d{5}$/.test(zip)) return { zip, status: 'idle' as ZipStatus, place: undefined }
  // A complete ZIP whose lookup hasn't come back yet counts as "checking", never as valid.
  return result.zip === zip ? result : { zip, status: 'checking' as ZipStatus, place: undefined }
}

/** Checks (debounced) whether a well-formed email is already registered. */
function useEmailCheck(email: string): EmailStatus {
  const normalized = email.trim().toLowerCase()
  const [result, setResult] = useState<{ email: string; status: EmailStatus }>({ email: '', status: 'idle' })
  useEffect(() => {
    if (!isEmailWellFormed(normalized)) return
    let cancelled = false
    const timer = setTimeout(() => {
      api
        .emailAvailable(normalized)
        .then((r) => !cancelled && setResult({ email: normalized, status: r.available ? 'available' : 'taken' }))
        .catch(() => !cancelled && setResult({ email: normalized, status: 'error' }))
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [normalized])
  if (!isEmailWellFormed(normalized)) return 'idle'
  return result.email === normalized ? result.status : 'checking'
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography variant="overline" component="h2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
      {children}
    </Typography>
  )
}

/** Sign-up Step 1: basic info, photo, and the community pledge. */
export default function BasicsStep() {
  const navigate = useNavigate()
  const basics = useOnboarding((s) => s.basics)
  const setBasics = useOnboarding((s) => s.setBasics)
  const [touched, setTouched] = useState<Partial<Record<keyof BasicsDraft, boolean>>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const zip = useZipLookup(basics.zip)
  const emailStatus = useEmailCheck(basics.email)
  const errors = useMemo(
    () => validateBasics(basics, { currentYear: CURRENT_YEAR, zipStatus: zip.status, emailStatus }),
    [basics, zip.status, emailStatus],
  )
  const isValid = Object.keys(errors).length === 0

  const touch = (field: keyof BasicsDraft) => setTouched((t) => ({ ...t, [field]: true }))
  // "Checking…" isn't an error; show it as neutral helper text.
  const isPending = (msg: string | undefined) => !!msg && msg.endsWith('…')
  const showError = (field: keyof BasicsDraft) => !!touched[field] && !!errors[field] && !isPending(errors[field])
  const helper = (field: keyof BasicsDraft, fallback?: ReactNode) =>
    showError(field) ? errors[field] : isPending(errors[field]) ? errors[field] : fallback

  // Shared props for the plain text fields.
  const text = (field: 'firstName' | 'lastName' | 'email' | 'raceCulture', label: string) => ({
    label,
    value: basics[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setBasics({ [field]: e.target.value }),
    onBlur: () => touch(field),
    error: showError(field),
    fullWidth: true,
  })

  async function onPhotoPicked(file: File | undefined) {
    if (!file) return
    setPhotoError(null)
    setPhotoBusy(true)
    try {
      setBasics({ photoDataUrl: await prepareProfilePhoto(file) })
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Something went wrong with that photo.')
    } finally {
      setPhotoBusy(false)
      touch('photoDataUrl')
      if (fileInput.current) fileInput.current.value = '' // allow re-picking the same file
    }
  }

  return (
    <Stack
      component="form"
      spacing={3}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (isValid) navigate('/signup/2')
      }}
    >
      {/* Photo */}
      <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}>
        <Avatar
          src={basics.photoDataUrl ?? undefined}
          alt={basics.photoDataUrl ? 'Your profile photo preview' : ''}
          sx={{
            width: 104, height: 104, bgcolor: brand.foam, color: brand.espresso,
            border: 2, borderColor: showError('photoDataUrl') || photoError ? 'error.main' : 'primary.main',
            boxShadow: hardShadow(4, brand.terracotta),
          }}
        >
          {photoBusy ? <CircularProgress size={28} /> : <AddAPhotoOutlinedIcon sx={{ fontSize: 36 }} />}
        </Avatar>
        <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Typography sx={{ fontWeight: 700 }}>Profile photo</Typography>
          <Button variant="outlined" size="small" onClick={() => fileInput.current?.click()} disabled={photoBusy}>
            {basics.photoDataUrl ? 'Change photo' : 'Upload photo'}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept={PHOTO_ACCEPT}
            hidden
            aria-label="Profile photo"
            data-testid="photo-input"
            onChange={(e) => void onPhotoPicked(e.target.files?.[0])}
          />
          {(photoError || showError('photoDataUrl')) && (
            <FormHelperText error sx={{ m: 0 }}>{photoError ?? errors.photoDataUrl}</FormHelperText>
          )}
        </Stack>
      </Stack>

      {/* Name + account */}
      <Stack spacing={2}>
        <SectionLabel>About you</SectionLabel>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField {...text('firstName', 'First name')} helperText={helper('firstName')}
            autoComplete="given-name" />
          <TextField {...text('lastName', 'Last name')} helperText={helper('lastName')}
            autoComplete="family-name" />
        </Stack>
        <TextField
          {...text('email', 'Email')}
          type="email"
          autoComplete="email"
          // Show "already exists" right away, without waiting for blur.
          error={showError('email') || emailStatus === 'taken'}
          helperText={emailStatus === 'taken' ? errors.email : helper('email')}
        />
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={basics.password}
          onChange={(e) => setBasics({ password: e.target.value })}
          onBlur={() => touch('password')}
          error={showError('password')}
          helperText={helper('password', 'At least 8 characters. (Demo app: passwords are not secured.)')}
          fullWidth
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Stack direction="row" spacing={2}>
          <TextField
            label="ZIP code"
            value={basics.zip}
            onChange={(e) => setBasics({ zip: e.target.value.replace(/\D/g, '').slice(0, 5) })}
            onBlur={() => touch('zip')}
            error={showError('zip') || zip.status === 'not_found'}
            helperText={zip.status === 'not_found' ? errors.zip : helper('zip', zip.place)}
            autoComplete="postal-code"
            sx={{ flex: 1 }}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 5, pattern: '\\d{5}' } }}
          />
          <TextField
            select
            label="Birth year"
            value={basics.birthYear ?? ''}
            onChange={(e) => {
              setBasics({ birthYear: Number(e.target.value) })
              touch('birthYear')
            }}
            onBlur={() => touch('birthYear')}
            error={showError('birthYear')}
            helperText={helper('birthYear')}
            sx={{ flex: 1 }}
            slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: { maxHeight: 320 } } } } } }}
          >
            {YEARS.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </TextField>
        </Stack>
        <TextField
          {...text('raceCulture', 'Race / Culture (optional)')}
          placeholder="e.g. Indian, Nigerian American, Puerto Rican"
          helperText="Shown on your profile and feed card so women who share your background can find you."
          slotProps={{ htmlInput: { maxLength: 60 } }}
        />
      </Stack>

      {/* Pledge */}
      <Card sx={{ bgcolor: brand.foam }}>
        <CardContent>
          <SectionLabel>The Drip pledge</SectionLabel>
          <Stack>
            <FormControlLabel
              control={
                <Checkbox
                  checked={basics.is18Plus}
                  onChange={(e) => {
                    setBasics({ is18Plus: e.target.checked })
                    touch('is18Plus')
                  }}
                />
              }
              label="I am 18 years or older"
            />
            {showError('is18Plus') && <FormHelperText error sx={{ mt: -0.5, ml: 4 }}>{errors.is18Plus}</FormHelperText>}
            <FormControlLabel
              control={
                <Checkbox
                  checked={basics.identifiesAsWoman}
                  onChange={(e) => {
                    setBasics({ identifiesAsWoman: e.target.checked })
                    touch('identifiesAsWoman')
                  }}
                />
              }
              label="I identify as a woman"
            />
            {showError('identifiesAsWoman') && (
              <FormHelperText error sx={{ mt: -0.5, ml: 4 }}>{errors.identifiesAsWoman}</FormHelperText>
            )}
          </Stack>
        </CardContent>
      </Card>

      {!isValid && Object.keys(touched).length > 0 && (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 1 }}>
          Fill in every field and check both boxes to continue.
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button component={RouterLink} to="/feed">Cancel</Button>
        <Button type="submit" variant="contained" disabled={!isValid}>
          Next
        </Button>
      </Box>
    </Stack>
  )
}
