import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Avatar, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import LocalCafeIcon from '@mui/icons-material/LocalCafe'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import type { FeedCard } from '../api'
import { MEETING_PREF_LABELS } from '../constants'
import { brand, hardShadow } from '../theme'
import { formatDistance, swipeOutcome } from './distance'

const chipSx = { textTransform: 'none', fontSize: '0.78rem', letterSpacing: 0 } as const
const EXIT_MS = 220

interface Drag {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastT: number
  velocity: number
  axis: 'x' | 'y' | null
}

/** A feed card you can swipe right (coffee?) or left (pass), or use the buttons. */
export default function SwipeCard({ card, onPass, onCoffee }: {
  card: FeedCard
  onPass: (card: FeedCard) => void
  onCoffee: (card: FeedCard) => void
}) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null)
  const drag = useRef<Drag | null>(null)

  function finish(direction: 'left' | 'right') {
    setLeaving(direction)
    setDragging(false)
    window.setTimeout(() => {
      if (direction === 'left') onPass(card)
      else {
        onCoffee(card)
        // The card stays in the feed until a request is actually sent (Step 10).
        setLeaving(null)
        setDx(0)
      }
    }, EXIT_MS)
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (leaving || (e.target as HTMLElement).closest('button, a')) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastT: e.timeStamp, velocity: 0, axis: null }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const moveX = e.clientX - d.startX
    const moveY = e.clientY - d.startY
    if (d.axis === null) {
      // Decide once whether this is a horizontal swipe or a vertical scroll.
      if (Math.abs(moveX) > 8 && Math.abs(moveX) > Math.abs(moveY)) {
        d.axis = 'x'
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
      } else if (Math.abs(moveY) > 8) {
        drag.current = null // let the page scroll
        return
      } else return
    }
    const dt = Math.max(1, e.timeStamp - d.lastT)
    d.velocity = (e.clientX - d.lastX) / dt
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    setDx(moveX)
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) {
    const d = drag.current
    drag.current = null
    if (!d || d.axis !== 'x') return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    const outcome = cancelled ? null : swipeOutcome(e.clientX - d.startX, d.velocity)
    if (outcome) finish(outcome)
    else {
      setDragging(false)
      setDx(0)
    }
  }

  const offset = leaving === 'left' ? -window.innerWidth : leaving === 'right' ? window.innerWidth : dx
  const coffeeOpacity = Math.min(1, Math.max(0, offset / 100))
  const passOpacity = Math.min(1, Math.max(0, -offset / 100))
  const distance = formatDistance(card.distanceMiles)
  const place = card.city && card.state ? `${card.city}, ${card.state}` : null

  return (
    <Box
      data-testid="feed-card"
      data-user-id={card.id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e, false)}
      onPointerCancel={(e) => endDrag(e, true)}
      sx={{
        position: 'relative',
        touchAction: 'pan-y', // vertical scrolling stays native; we handle horizontal drags
        userSelect: dragging ? 'none' : 'auto',
        cursor: dragging ? 'grabbing' : 'grab',
        transform: `translateX(${offset}px) rotate(${offset / 22}deg)`,
        transition: dragging ? 'none' : `transform ${EXIT_MS}ms ease-out, opacity ${EXIT_MS}ms`,
        opacity: leaving === 'left' ? 0 : 1,
      }}
    >
      {/* Swipe stamps */}
      <Stamp label="Coffee?" color={brand.sage} side="left" opacity={coffeeOpacity} />
      <Stamp label="Pass" color={brand.terracotta} side="right" opacity={passOpacity} />

      <Card component="article" aria-label={`${card.firstName} ${card.lastName}`}>
        <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Avatar
              src={card.photoUrl ?? undefined}
              alt=""
              slotProps={{ img: { draggable: false } }}
              sx={{ width: 104, height: 104, border: 2, borderColor: 'primary.main', boxShadow: hardShadow(3, brand.terracotta), flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography
                variant="h5"
                component={RouterLink}
                to={`/profile/${card.id}`}
                draggable={false}
                sx={{ color: 'inherit', textDecoration: 'none', display: 'block', lineHeight: 1.1, '&:hover': { textDecoration: 'underline' } }}
              >
                {card.firstName} {card.lastName}
              </Typography>
              <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
                <Chip size="small" label={card.careerStage} variant="outlined" />
                {card.raceCulture && <Chip size="small" label={card.raceCulture} variant="outlined" />}
              </Stack>
              {(distance || place) && (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 1, color: 'text.secondary' }}>
                  <PlaceOutlinedIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2" data-testid="distance">
                    {[distance, place].filter(Boolean).join(' · ')}
                  </Typography>
                </Stack>
              )}
              <Typography variant="caption" color="text.secondary">
                Meets: {MEETING_PREF_LABELS[card.meetingPref]}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ mt: 2 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.6, display: 'block' }}>Can help with</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {card.experienceTags.map((t) => <Chip key={t} label={t} size="small" color="primary" variant="outlined" sx={chipSx} />)}
            </Box>
          </Box>
          {card.interestTags.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.6, display: 'block' }}>Wants to explore</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {card.interestTags.map((t) => <Chip key={t} label={t} size="small" sx={{ ...chipSx, bgcolor: brand.foam }} />)}
              </Box>
            </Box>
          )}
          {card.funFact && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: brand.foam, borderLeft: `4px solid ${brand.terracotta}` }}>
              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.04em' }}>{card.funFact.label}</Typography>
              <Typography variant="body2">“{card.funFact.text}”</Typography>
            </Box>
          )}

          <Stack direction="row" spacing={1.5} sx={{ mt: 2.25 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<CloseIcon />}
              onClick={() => finish('left')}
              aria-label={`Pass on ${card.firstName}`}
            >
              Pass
            </Button>
            <Button
              fullWidth
              variant="contained"
              startIcon={<LocalCafeIcon />}
              onClick={() => finish('right')}
              aria-label={`Ask ${card.firstName} for coffee`}
            >
              Coffee?
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

function Stamp({ label, color, side, opacity }: { label: string; color: string; side: 'left' | 'right'; opacity: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute', top: 22, [side]: 18, zIndex: 2, pointerEvents: 'none', opacity,
        border: `3px solid ${color}`, color, bgcolor: 'rgba(255,255,255,0.9)', px: 1.25, py: 0.25, borderRadius: 0.5,
        fontWeight: 800, fontSize: 22, letterSpacing: '0.08em', textTransform: 'uppercase',
        transform: `rotate(${side === 'left' ? -12 : 12}deg)`,
      }}
    >
      {label}
    </Box>
  )
}
