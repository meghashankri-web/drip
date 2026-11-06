import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Skeleton, Stack, TextField, Typography,
} from '@mui/material'
import EventIcon from '@mui/icons-material/Event'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineRounded'
import { api, type InboxMessage, type Meeting } from '../api'
import { errorMessage } from '../hooks'
import { useSession } from '../store/session'
import { brand } from '../theme'
import { googleCalendarUrl } from '../messages/calendar'
import PromptBody from '../messages/PromptBody'

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

export default function MessagesPage() {
  const currentUserId = useSession((s) => s.currentUserId)
  return <Inbox key={currentUserId ?? 'none'} />
}

function Inbox() {
  const [messages, setMessages] = useState<InboxMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const me = useSession((s) => s.currentUserId)

  const load = useCallback(() => {
    api.listMessages().then(setMessages).catch((e: unknown) => setError(errorMessage(e)))
  }, [])
  useEffect(() => {
    load()
    // Unread markers show for this visit; mark them read on the server.
    const t = setTimeout(() => void api.markAllRead().catch(() => {}), 1500)
    return () => clearTimeout(t)
  }, [load])

  return (
    <Stack spacing={2.5}>
      <Typography variant="h4" component="h1">Messages</Typography>
      {error && <Alert severity="error">Couldn’t load messages: {error}</Alert>}
      {!messages && !error && [0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={90} />)}
      {messages && messages.length === 0 && (
        <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', py: 6, border: `2px dashed ${brand.latte}`, borderRadius: 1 }}>
          <ChatBubbleOutlineIcon sx={{ fontSize: 44, color: 'secondary.main' }} />
          <Typography sx={{ fontWeight: 700 }}>No messages yet</Typography>
          <Typography variant="body2" color="text.secondary">Requests, replies and cheers will show up here.</Typography>
        </Stack>
      )}
      {messages?.map((m) => <MessageCard key={m.id} m={m} me={me} onChanged={load} />)}
    </Stack>
  )
}

function CalendarButton({ meeting, otherName, note }: { meeting: Meeting; otherName: string; note?: string }) {
  const href = googleCalendarUrl({
    title: `Coffee chat with ${otherName} (Drip)`,
    start: meeting.datetime,
    details: `Coffee chat set up on Drip.${note ? `\n\n“${note}”` : ''}`,
    location: meeting.location,
  })
  return (
    <Button variant="contained" startIcon={<EventIcon />} href={href} target="_blank" rel="noopener" data-testid="gcal-link">
      Add to Google Calendar
    </Button>
  )
}

function MessageCard({ m, me, onChanged }: { m: InboxMessage; me: number | null; onChanged: () => void }) {
  const unread = !m.readAt
  const fromDrip = !m.from
  return (
    <Card data-testid="message" data-type={m.type} sx={{ borderColor: unread ? brand.terracotta : undefined }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          {fromDrip ? (
            <Avatar sx={{ bgcolor: brand.espresso, color: brand.cream }}><WaterDropOutlinedIcon /></Avatar>
          ) : (
            <Avatar component={RouterLink} to={`/profile/${m.from!.id}`} src={m.from!.photoUrl ?? undefined} alt="" />
          )}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 700 }}>
                {fromDrip ? 'Drip' : `${m.from!.firstName} ${m.from!.lastName}`}
                {unread && <Box component="span" aria-label="unread" data-testid="unread" sx={{ display: 'inline-block', width: 8, height: 8, bgcolor: 'secondary.main', ml: 1, verticalAlign: 'middle' }} />}
              </Typography>
              <Typography variant="caption" color="text.secondary">{ago(m.createdAt)}</Typography>
            </Stack>
            {m.type === 'chat_request' && m.request ? (
              <RequestBody m={m} me={me} onChanged={onChanged} />
            ) : (
              <>
                <Typography sx={{ mt: 0.5 }}>{m.body}</Typography>
                {m.type === 'accepted' && m.meeting && m.from && (
                  <Box sx={{ mt: 1.5 }}>
                    <MeetingBox meeting={m.meeting} />
                    <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                      <CalendarButton meeting={m.meeting} otherName={m.from.firstName} />
                      <SimulateButton meetingId={m.meeting.id} onDone={onChanged} />
                    </Stack>
                  </Box>
                )}
                {m.type === 'post_meeting_prompt' && m.prompt && <PromptBody prompt={m.prompt} onChanged={onChanged} />}
              </>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

/** Demo control: pretend the meeting time has passed so the "did it happen?" prompt appears now. */
function SimulateButton({ meetingId, onDone }: { meetingId: number; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <Button size="small" variant="outlined" disabled={busy} data-testid="simulate-passed"
      onClick={() => { setBusy(true); api.simulateMeetingPassed(meetingId).then(onDone).finally(() => setBusy(false)) }}>
      Demo: simulate meeting passed
    </Button>
  )
}

function MeetingBox({ meeting }: { meeting: Meeting }) {
  return (
    <Box sx={{ p: 1.5, bgcolor: brand.foam, borderLeft: `4px solid ${brand.sage}` }} data-testid="meeting">
      <Typography variant="body2" sx={{ fontWeight: 700 }}>📅 {when(meeting.datetime)}</Typography>
      <Typography variant="body2">📍 {meeting.location}</Typography>
    </Box>
  )
}

function RequestBody({ m, me: _me, onChanged }: { m: InboxMessage; me: number | null; onChanged: () => void }) {
  const r = m.request!
  const from = m.from!
  const [mode, setMode] = useState<'idle' | 'accept'>('idle')
  const [datetime, setDatetime] = useState('')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function respond(body: Parameters<typeof api.respond>[1]) {
    setBusy(true)
    setError(null)
    try {
      await api.respond(r.id, body)
      onChanged()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  const canConfirm = datetime !== '' && location.trim() !== '' && !busy
  return (
    <Stack spacing={1.5} sx={{ mt: 0.5 }}>
      <Typography variant="body2" color="text.secondary">wants to grab coffee</Typography>
      <Box sx={{ p: 1.5, bgcolor: '#fff', border: 2, borderColor: 'primary.main' }}>
        <Typography>“{r.message}”</Typography>
      </Box>
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>She’s generally free</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {r.availability.map((s) => <Chip key={`${s.day}-${s.block}`} size="small" label={`${s.day} ${s.block}`} sx={{ textTransform: 'none', letterSpacing: 0 }} />)}
        </Box>
      </Box>
      <Button component={RouterLink} to={`/profile/${from.id}`} size="small" sx={{ alignSelf: 'flex-start', p: 0, minWidth: 0 }}>
        View {from.firstName}’s profile
      </Button>

      {r.status === 'pending' && mode === 'idle' && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => setMode('accept')} disabled={busy}>Accept</Button>
          <Button variant="outlined" onClick={() => void respond({ action: 'not_now' })} disabled={busy}>Not now</Button>
          <Button onClick={() => void respond({ action: 'decline' })} disabled={busy}>Decline</Button>
        </Stack>
      )}
      {r.status === 'pending' && mode === 'accept' && (
        <Stack spacing={1.5} sx={{ p: 1.5, border: `2px dashed ${brand.espresso}` }}>
          <Typography sx={{ fontWeight: 700 }}>Pick a time and place</Typography>
          <TextField
            label="Date & time"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': 'Date and time' } }}
          />
          <TextField
            label="Location or Zoom link"
            placeholder="e.g. Blue Bottle Coffee, Oakland"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            slotProps={{ htmlInput: { 'aria-label': 'Location', maxLength: 300 } }}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" disabled={!canConfirm}
              onClick={() => void respond({ action: 'accept', datetime: new Date(datetime).toISOString(), location: location.trim() })}>
              Confirm
            </Button>
            <Button onClick={() => setMode('idle')} disabled={busy}>Cancel</Button>
          </Stack>
        </Stack>
      )}
      {r.status === 'accepted' && m.meeting && (
        <Stack spacing={1.5}>
          <Chip label="Accepted" color="success" sx={{ alignSelf: 'flex-start' }} />
          <MeetingBox meeting={m.meeting} />
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <CalendarButton meeting={m.meeting} otherName={from.firstName} note={r.message} />
            <SimulateButton meetingId={m.meeting.id} onDone={onChanged} />
          </Stack>
        </Stack>
      )}
      {r.status === 'not_now' && <Chip label="Not now · she’ll reappear in your feed in 30 days" sx={{ alignSelf: 'flex-start', textTransform: 'none' }} />}
      {r.status === 'declined' && <Chip label="Declined" sx={{ alignSelf: 'flex-start' }} />}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  )
}
