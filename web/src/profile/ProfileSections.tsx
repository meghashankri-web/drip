import { useState, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Skeleton, Slider, Stack, Typography,
} from '@mui/material'
import WavesIcon from '@mui/icons-material/Waves'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { api, type Post, type UserProfile } from '../api'
import { errorMessage } from '../hooks'
import { MEETING_PREF_LABELS } from '../constants'
import { brand, hardShadow } from '../theme'
import { CHATS_MAX, CHATS_MIN } from '../signup/personality'
import { parseResume } from './resumeFormat'

const chipSx = { textTransform: 'none', fontSize: '0.8rem', letterSpacing: 0 } as const

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography variant="overline" component="h2" sx={{ color: 'text.secondary', lineHeight: 1.5, display: 'block', mb: 1 }}>
      {children}
    </Typography>
  )
}

/** Photo, name with ripple count beside it, and quick facts. */
export function ProfileHeader({ user }: { user: UserProfile }) {
  const place = user.city && user.state ? `${user.city}, ${user.state}` : user.zip
  return (
    // Centered when stacked on phones; left-aligned in the desktop left column.
    <Stack spacing={1.5} sx={{ alignItems: { xs: 'center', md: 'flex-start' }, textAlign: { xs: 'center', md: 'left' }, pt: 1 }}>
      <Avatar
        src={user.photoUrl ?? undefined}
        alt=""
        sx={{
          width: { xs: 120, md: 200 }, height: { xs: 120, md: 200 }, border: 2, borderColor: 'primary.main',
          boxShadow: hardShadow(5, brand.terracotta),
        }}
      />
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }} useFlexGap>
        <Typography variant="h4" component="h1">
          {user.firstName} {user.lastName}
        </Typography>
        <Chip
          icon={<WavesIcon />}
          label={`${user.rippleCount} ${user.rippleCount === 1 ? 'ripple' : 'ripples'}`}
          color="primary"
          aria-label={`${user.rippleCount} ripples (completed coffee chats)`}
          data-testid="ripple-count"
        />
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
        <Chip label={user.careerStage} variant="outlined" />
        <Chip label={place} variant="outlined" />
        {user.raceCulture && <Chip label={user.raceCulture} variant="outlined" />}
      </Stack>
    </Stack>
  )
}

/** Summary, what she offers, and what she wants to explore. */
export function BioSection({ user }: { user: UserProfile }) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          {user.summary && <Typography sx={{ fontSize: '1.02rem' }}>{user.summary}</Typography>}
          <Box>
            <SectionTitle>Can help with</SectionTitle>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }} data-testid="experience-tags">
              {user.experienceTags.map((t) => <Chip key={t} label={t} color="primary" variant="outlined" sx={chipSx} />)}
            </Box>
          </Box>
          <Box>
            <SectionTitle>Wants to explore</SectionTitle>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }} data-testid="interest-tags">
              {user.interestTags.map((t, i) => (
                <Chip
                  key={t}
                  label={t}
                  sx={{ ...chipSx, bgcolor: i === 0 ? brand.terracotta : brand.foam, color: i === 0 ? '#fff' : 'text.primary' }}
                  avatar={<Box component="span" sx={{ fontWeight: 700, bgcolor: 'transparent !important', color: 'inherit !important' }}>{i + 1}</Box>}
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

function QA({ q, a }: { q: string; a: string | null }) {
  if (!a) return null
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.04em' }}>{q}</Typography>
      <Typography>{a}</Typography>
    </Box>
  )
}

/** The Step 4 answers plus coffee-chat preferences (editable on your own profile). */
export function PersonalitySection({ user, isOwn, onUpdated }: { user: UserProfile; isOwn: boolean; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false)
  return (
    <Card>
      <CardContent>
        <SectionTitle>Get to know {user.firstName}</SectionTitle>
        <Stack spacing={1.75}>
          <QA q="Hobbies & interests" a={user.hobbies} />
          <QA q="Best advice given or received" a={user.bestAdvice} />
          <QA q="A woman I look up to" a={user.womanAdmired} />
          <QA q="Ask me about" a={user.askMeAbout} />
        </Stack>
        <Box sx={{ borderTop: 2, borderColor: 'primary.main', mt: 2.5, pt: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Coffee chats</Typography>
              <Typography data-testid="chats-summary">
                {MEETING_PREF_LABELS[user.meetingPref]} · {user.chatsPerMonth} per month
              </Typography>
            </Box>
            {isOwn && (
              <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </Stack>
        </Box>
      </CardContent>
      {isOwn && editing && (
        <ChatsPerMonthDialog
          userId={user.id}
          initial={user.chatsPerMonth}
          onClose={(saved) => {
            setEditing(false)
            if (saved) onUpdated()
          }}
        />
      )}
    </Card>
  )
}

function ChatsPerMonthDialog({ userId, initial, onClose }: { userId: number; initial: number; onClose: (saved: boolean) => void }) {
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function save() {
    setSaving(true)
    setError(null)
    try {
      await api.updatePreferences(userId, { chatsPerMonth: value })
      onClose(true)
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }
  return (
    <Dialog open onClose={() => !saving && onClose(false)} fullWidth maxWidth="xs"
      slotProps={{ paper: { sx: { border: 2, borderColor: 'primary.main', boxShadow: hardShadow(5), borderRadius: 1 } } }}>
      <DialogTitle sx={{ fontFamily: 'inherit' }}>Coffee chats per month</DialogTitle>
      <DialogContent>
        <Typography variant="h3" component="p" sx={{ color: 'secondary.main', textAlign: 'center', my: 1 }} aria-hidden>{value}</Typography>
        <Box sx={{ px: 1.5 }}>
          <Slider
            value={value}
            min={CHATS_MIN}
            max={CHATS_MAX}
            step={1}
            marks
            onChange={(_e, v) => setValue(v as number)}
            slotProps={{ input: { 'aria-label': 'Coffee chats per month' } }}
            sx={{ color: brand.espresso, '& .MuiSlider-thumb': { borderRadius: 0.5 } }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">We’ll suggest about this many chats each month.</Typography>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={() => onClose(false)} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving || value === initial}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/** The Resume tab: plain resume text with headings and bullets. */
export function ResumeTab({ text }: { text: string | null }) {
  const blocks = text ? parseResume(text) : []
  if (blocks.length === 0) {
    return <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No resume added yet.</Typography>
  }
  return (
    <Card>
      <CardContent sx={{ '& > *:first-of-type': { mt: 0 } }} data-testid="resume-text">
        {blocks.map((b, i) => {
          switch (b.type) {
            case 'name':
              return <Typography key={i} variant="h5" component="p" sx={{ mb: 0.5 }}>{b.text}</Typography>
            case 'heading':
              return (
                <Typography key={i} variant="overline" component="h3"
                  sx={{ display: 'block', mt: 2.5, mb: 0.5, borderBottom: 2, borderColor: 'primary.main', color: 'text.primary' }}>
                  {b.text}
                </Typography>
              )
            case 'bullets':
              return (
                <Box key={i} component="ul" sx={{ m: 0, mb: 1, pl: 2.5 }}>
                  {b.items.map((item, j) => <Typography key={j} component="li" variant="body2" sx={{ mb: 0.25 }}>{item}</Typography>)}
                </Box>
              )
            default:
              return <Typography key={i} variant="body2" sx={{ fontWeight: /—| - /.test(b.text) ? 600 : 400, mt: 0.5 }}>{b.text}</Typography>
          }
        })}
      </CardContent>
    </Card>
  )
}

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

/** The Posts tab: this member's own post-chat posts. Cheers totals show only to the author. */
export function PostsTab({ posts, loading, error, isOwn, firstName }: {
  posts: Post[] | null; loading: boolean; error: string | null; isOwn: boolean; firstName: string
}) {
  if (loading && !posts) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={260} />
        <Skeleton variant="rounded" height={260} />
      </Stack>
    )
  }
  if (error) return <Alert severity="error">Couldn’t load posts: {error}</Alert>
  if (!posts || posts.length === 0) {
    return (
      <Box sx={{ border: `2px dashed ${brand.latte}`, borderRadius: 1, p: 4, textAlign: 'center' }} data-testid="posts-empty">
        <WavesIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
        <Typography sx={{ fontWeight: 700, mt: 1 }}>{isOwn ? 'No posts yet' : `${firstName} hasn’t posted yet`}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {isOwn
            ? 'After a coffee chat, share a photo and a few kind words. They’ll show up here.'
            : 'Posts from her coffee chats will show up here.'}
        </Typography>
      </Box>
    )
  }
  return (
    <Stack spacing={2.5} data-testid="posts-list">
      {posts.map((p) => (
        <Card key={p.id} component="article">
          {p.photoUrl && (
            <Box component="img" src={p.photoUrl} alt={`Coffee chat with ${p.partner.firstName}`}
              sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block', borderBottom: 2, borderColor: 'primary.main' }} />
          )}
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <Avatar src={p.partner.photoUrl ?? undefined} alt="" sx={{ width: 28, height: 28 }} />
              <Typography variant="body2">
                Coffee with{' '}
                <Box component={RouterLink} to={`/profile/${p.partner.id}`} sx={{ color: 'inherit', fontWeight: 700 }}>
                  {p.partner.firstName} {p.partner.lastName}
                </Box>
              </Typography>
            </Stack>
            {p.caption && <Typography>{p.caption}</Typography>}
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary">{dateFmt.format(new Date(p.createdAt))}</Typography>
              {p.cheersCount !== undefined && (
                <Typography variant="body2" sx={{ fontWeight: 700 }} data-testid="cheers-count">
                  🥂 {p.cheersCount} cheers
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
