import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, LinearProgress, MenuItem, Stack, TextField, Typography,
} from '@mui/material'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import { api } from '../api'
import TagEditor from '../components/TagEditor'
import { errorMessage } from '../hooks'
import { useOnboarding } from '../store/onboarding'
import { brand, hardShadow } from '../theme'
import {
  CAREER_STAGES, checkResumeFile, EXPERIENCE_TAGS_MAX, isResumeComplete, RESUME_ACCEPT, SUMMARY_MAX,
} from './resume'

const LOADING_MESSAGES = [
  'Reading your resume…',
  'Spotting what you could teach others…',
  'Writing your summary…',
  'Choosing your experience tags…',
  'Almost there…',
]

type Phase =
  | { name: 'idle' }
  | { name: 'analyzing'; fileName: string }
  | { name: 'error'; message: string; canRetry: boolean }

/** Rotates through friendly status messages while Claude works. */
function useRotatingMessage(active: boolean): string {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setI((n) => Math.min(n + 1, LOADING_MESSAGES.length - 1)), 3000)
    return () => {
      clearInterval(timer)
      setI(0)
    }
  }, [active])
  return LOADING_MESSAGES[i]!
}

/** Sign-up Step 2: upload a resume, let Claude summarize it, then review and edit. */
export default function ResumeStep() {
  const navigate = useNavigate()
  const resume = useOnboarding((s) => s.resume)
  const setResume = useOnboarding((s) => s.setResume)
  const updateResume = useOnboarding((s) => s.updateResume)
  const [phase, setPhase] = useState<Phase>({ name: 'idle' })
  const [dragOver, setDragOver] = useState(false)
  const [lastFile, setLastFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const loadingMessage = useRotatingMessage(phase.name === 'analyzing')

  async function analyze(file: File) {
    const problem = checkResumeFile(file)
    if (problem) {
      // Rejected in the browser: no request is sent.
      setPhase({ name: 'error', message: problem, canRetry: false })
      return
    }
    setLastFile(file)
    setPhase({ name: 'analyzing', fileName: file.name })
    try {
      const result = await api.analyzeResume(file)
      setResume({
        file: result.file,
        source: 'claude',
        summary: result.summary,
        experienceTags: result.experienceTags,
        careerStage: result.careerStage,
        resumeText: result.resumeText,
      })
      setPhase({ name: 'idle' })
    } catch (e) {
      setPhase({ name: 'error', message: errorMessage(e), canRetry: true })
    }
  }

  function enterManually() {
    setResume({ file: null, source: 'manual', summary: '', experienceTags: [], careerStage: null, resumeText: '' })
    setPhase({ name: 'idle' })
  }

  const pickFile = () => fileInput.current?.click()
  const hiddenInput = (
    <input
      ref={fileInput}
      type="file"
      hidden
      accept={RESUME_ACCEPT}
      aria-label="Resume file"
      data-testid="resume-input"
      onChange={(e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (file) void analyze(file)
      }}
    />
  )

  // ---- Analyzing ----
  if (phase.name === 'analyzing') {
    return (
      <Card role="status" aria-live="polite">
        <CardContent sx={{ py: 5 }}>
          <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <AutoAwesomeOutlinedIcon sx={{ fontSize: 44, color: 'secondary.main' }} />
            <Typography variant="h6" component="p">{loadingMessage}</Typography>
            <Box sx={{ width: '100%', maxWidth: 320 }}>
              <LinearProgress color="secondary" sx={{ height: 6, borderRadius: 0 }} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Claude is analyzing <b>{phase.fileName}</b>. This usually takes 5–20 seconds.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  // ---- Upload (no analysis yet), with an error banner if the last attempt failed ----
  if (!resume) {
    return (
      <Stack spacing={3}>
        {phase.name === 'error' && (
          <Alert
            severity="error"
            variant="outlined"
            sx={{ borderRadius: 1, borderWidth: 2 }}
            action={
              phase.canRetry && lastFile ? (
                <Button color="inherit" size="small" onClick={() => lastFile && void analyze(lastFile)}>
                  Retry
                </Button>
              ) : undefined
            }
          >
            <AlertTitle sx={{ fontWeight: 700 }}>
              {phase.canRetry ? 'We couldn’t analyze your resume' : 'That file won’t work'}
            </AlertTitle>
            {phase.message}
          </Alert>
        )}

        <Box
          onClick={pickFile}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pickFile())}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) void analyze(file)
          }}
          role="button"
          tabIndex={0}
          aria-label="Upload your resume"
          sx={{
            border: `2px dashed ${brand.espresso}`,
            borderRadius: 1,
            bgcolor: dragOver ? brand.foam : '#fff',
            py: 5,
            px: 3,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'background-color 120ms',
            '&:hover, &:focus-visible': { bgcolor: brand.foam, outline: 'none', boxShadow: hardShadow(4, brand.terracotta) },
          }}
        >
          <UploadFileOutlinedIcon sx={{ fontSize: 48, color: 'secondary.main' }} />
          <Typography variant="h6" component="p" sx={{ mt: 1 }}>Upload your resume</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            PDF, Word (.doc, .docx), or .txt · up to 5 MB
          </Typography>
          <Button variant="contained" sx={{ mt: 2.5 }} tabIndex={-1}>Choose file</Button>
        </Box>
        {hiddenInput}

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Claude reads your resume and drafts a summary and experience tags. You can edit everything.
          {' '}
          <Button size="small" onClick={enterManually} sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline', letterSpacing: '0.04em' }}>
            Or add your experience by hand
          </Button>
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button component={RouterLink} to="/signup/1">Back</Button>
          <Button variant="contained" disabled>Next</Button>
        </Box>
      </Stack>
    )
  }

  // ---- Review & edit ----
  const complete = isResumeComplete(resume)
  return (
    <Stack spacing={3}>
      {hiddenInput}
      {phase.name === 'error' && (
        <Alert severity="error" variant="outlined" sx={{ borderRadius: 1, borderWidth: 2 }}
          action={phase.canRetry && lastFile ? (
            <Button color="inherit" size="small" onClick={() => lastFile && void analyze(lastFile)}>Retry</Button>
          ) : undefined}
        >
          {phase.message} Your current answers are unchanged.
        </Alert>
      )}

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', border: 2, borderColor: 'primary.main', borderRadius: 1, p: 1.5, bgcolor: '#fff' }}>
        <DescriptionOutlinedIcon color="primary" />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }} noWrap>
            {resume.file ? resume.file.name : 'No resume uploaded'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {resume.source === 'claude' ? 'Analyzed by Claude. Review and edit below.' : 'Entered by hand.'}
          </Typography>
        </Box>
        <Button size="small" variant="outlined" onClick={pickFile} sx={{ flexShrink: 0 }}>
          {resume.file ? 'Replace' : 'Upload'}
        </Button>
      </Stack>

      <TextField
        label="Your summary"
        multiline
        minRows={4}
        value={resume.summary}
        onChange={(e) => updateResume({ summary: e.target.value.slice(0, SUMMARY_MAX) })}
        error={!resume.summary.trim()}
        helperText={
          !resume.summary.trim()
            ? 'Add a short summary of your background'
            : `${resume.summary.length}/${SUMMARY_MAX} · Shown at the top of your profile`
        }
        fullWidth
      />

      <Stack spacing={1.5}>
        <Typography variant="overline" component="h2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
          Experience tags
        </Typography>
        <Alert
          icon={false}
          sx={{ bgcolor: brand.foam, color: 'text.primary', border: 2, borderColor: 'primary.main', borderRadius: 1 }}
        >
          These tags describe your <b>current experience</b>: what you can offer others. Next, you’ll choose what you
          want to <b>learn or get help with</b>.
        </Alert>
        <TagEditor
          label="Experience tags"
          tags={resume.experienceTags}
          onChange={(experienceTags) => updateResume({ experienceTags })}
          max={EXPERIENCE_TAGS_MAX}
          addPlaceholder="Add an experience, e.g. Fundraising"
        />
        {resume.experienceTags.length === 0 && (
          <Typography variant="body2" color="error">Add at least one experience tag.</Typography>
        )}
        <Typography variant="caption" color="text.secondary">Tap a tag to edit it, or × to remove it.</Typography>
      </Stack>

      <TextField
        select
        label="Career stage"
        value={resume.careerStage ?? ''}
        onChange={(e) => updateResume({ careerStage: e.target.value as (typeof CAREER_STAGES)[number] })}
        error={!resume.careerStage}
        helperText={
          resume.careerStage
            ? resume.source === 'claude' ? 'Suggested from your resume. Change it if it doesn’t fit.' : undefined
            : 'Choose your career stage'
        }
        fullWidth
        slotProps={{ select: { inputProps: { 'data-testid': 'career-stage' } } }}
      >
        {CAREER_STAGES.map((s) => (
          <MenuItem key={s} value={s}>{s}</MenuItem>
        ))}
      </TextField>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button component={RouterLink} to="/signup/1">Back</Button>
        <Button variant="contained" disabled={!complete} onClick={() => navigate('/signup/3')}>
          Next
        </Button>
      </Box>
    </Stack>
  )
}
