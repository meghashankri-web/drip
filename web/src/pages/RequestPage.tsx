import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Avatar, Box, Button, Card, CardContent, CircularProgress, Skeleton, Stack, TextField, Typography,
} from '@mui/material'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import SendIcon from '@mui/icons-material/Send'
import { api, type Insight, type Slot } from '../api'
import { errorMessage, useUser } from '../hooks'
import NotFoundPage from './NotFoundPage'
import { brand, hardShadow } from '../theme'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const BLOCKS = ['Morning', 'Lunch', 'Afternoon', 'Evening'] as const
export const MESSAGE_MAX = 100

/** /feed/request/:userId — left: why you two (Claude, live); right: message + availability. */
export default function RequestPage() {
  const id = Number(useParams().userId)
  const valid = Number.isInteger(id) && id > 0
  const navigate = useNavigate()
  const { data: user, loading, notFound } = useUser(valid ? id : null)
  const [insight, setInsight] = useState<Insight | null>(null)
  const [insightError, setInsightError] = useState(false)
  const [message, setMessage] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!valid) return
    let cancelled = false
    api.getInsight(id).then((r) => !cancelled && setInsight(r)).catch(() => !cancelled && setInsightError(true))
    return () => {
      cancelled = true
    }
  }, [id, valid])

  if (!valid || notFound) return <NotFoundPage />
  if (loading || !user) return <Skeleton variant="rounded" height={320} />

  const has = (s: Slot) => slots.some((x) => x.day === s.day && x.block === s.block)
  const toggle = (s: Slot) => setSlots((cur) => (has(s) ? cur.filter((x) => !(x.day === s.day && x.block === s.block)) : [...cur, s]))
  const canSend = message.trim().length > 0 && slots.length > 0 && !sending

  async function send() {
    setSending(true)
    setError(null)
    try {
      await api.sendRequest({ toUserId: id, message: message.trim(), availability: slots })
      navigate('/feed', { replace: true, state: { sentTo: user!.firstName } })
    } catch (e) {
      setError(errorMessage(e))
      setSending(false)
    }
  }

  return (
    <Stack spacing={2.5} data-testid="request-page">
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Avatar src={user.photoUrl ?? undefined} alt="" sx={{ width: 64, height: 64, border: 2, borderColor: 'primary.main', boxShadow: hardShadow(3, brand.terracotta) }} />
        <Box>
          <Typography variant="h4" component="h1">Coffee with {user.firstName}?</Typography>
          <Typography color="text.secondary">{user.careerStage}{user.city ? ` · ${user.city}, ${user.state}` : ''}</Typography>
        </Box>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, alignItems: 'start' }}>
        {/* Left: why you two */}
        <Card data-testid="insight-panel">
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
              <AutoAwesomeOutlinedIcon sx={{ color: 'secondary.main' }} />
              <Typography variant="h6" component="h2">Why you two</Typography>
            </Stack>
            {!insight && !insightError && (
              <Stack spacing={1} role="status">
                <Typography variant="body2" color="text.secondary">Claude is reading both profiles…</Typography>
                {[90, 75, 85, 60].map((w, i) => <Skeleton key={i} width={`${w}%`} />)}
                <Skeleton variant="rounded" height={70} sx={{ mt: 1 }} />
              </Stack>
            )}
            {insightError && <Typography color="text.secondary">Couldn’t load suggestions right now. You can still send a request.</Typography>}
            {insight && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>What you have in common</Typography>
                  {insight.commonGround.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Different paths, which can make for the best conversations.</Typography>
                  ) : (
                    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                      {insight.commonGround.map((c, i) => <Typography key={i} component="li" variant="body2" sx={{ mb: 0.5 }}>{c}</Typography>)}
                    </Box>
                  )}
                </Box>
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>Her experience that fits what you want to explore</Typography>
                  <Stack spacing={1}>
                    {insight.relevantExperience.length === 0 && (
                      <Typography variant="body2" color="text.secondary">No direct overlap with your interests, so ask her what she’s working on.</Typography>
                    )}
                    {insight.relevantExperience.map((r, i) => (
                      <Box key={i} sx={{ p: 1.25, bgcolor: brand.foam, borderLeft: `4px solid ${brand.terracotta}` }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.title}</Typography>
                        <Typography variant="body2">{r.why}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
                <Typography variant="caption" color="text.secondary" data-testid="insight-source">
                  {insight.source === 'claude' ? '✦ Personalized for you by Claude' : 'Based on your shared tags'}
                </Typography>
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Right: message + availability */}
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6" component="h2" sx={{ mb: 1 }}>Your message</Typography>
                <TextField
                  multiline
                  minRows={2}
                  fullWidth
                  placeholder={`Hi ${user.firstName}! I’d love to hear how you…`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
                  slotProps={{ htmlInput: { maxLength: MESSAGE_MAX, 'aria-label': 'Message' }, formHelperText: { sx: { textAlign: 'right', mx: 0 } } }}
                  helperText={<Box component="span" data-testid="char-count" sx={{ fontWeight: message.length >= MESSAGE_MAX ? 700 : 400 }}>{message.length}/{MESSAGE_MAX}</Box>}
                />
              </Box>
              <Box>
                <Typography variant="h6" component="h2">When are you free?</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Tap every time that generally works.</Typography>
                <Box role="group" aria-label="General availability" sx={{ display: 'grid', gridTemplateColumns: '64px repeat(7, 1fr)', gap: 0.5 }}>
                  <Box />
                  {DAYS.map((d) => <Typography key={d} variant="caption" sx={{ textAlign: 'center', fontWeight: 700 }}>{d}</Typography>)}
                  {BLOCKS.map((b) => (
                    <Box key={b} sx={{ display: 'contents' }}>
                      <Typography variant="caption" sx={{ alignSelf: 'center', fontWeight: 600 }}>{b}</Typography>
                      {DAYS.map((d) => {
                        const on = has({ day: d, block: b })
                        return (
                          <Box
                            key={d}
                            component="button"
                            type="button"
                            aria-pressed={on}
                            aria-label={`${d} ${b}`}
                            onClick={() => toggle({ day: d, block: b })}
                            sx={{
                              height: 34, cursor: 'pointer', borderRadius: 0.5, border: `2px solid ${on ? brand.espresso : brand.latte}`,
                              bgcolor: on ? brand.terracotta : '#fff', color: '#fff', fontWeight: 700, p: 0,
                            }}
                          >
                            {on ? '✓' : ''}
                          </Box>
                        )
                      })}
                    </Box>
                  ))}
                </Box>
              </Box>
              {error && <Alert severity="error">{error}</Alert>}
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Button component={RouterLink} to="/feed">Back to feed</Button>
                <Button variant="contained" startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />} disabled={!canSend} onClick={() => void send()}>
                  Send
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  )
}
