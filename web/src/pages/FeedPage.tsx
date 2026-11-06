import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Skeleton, Snackbar, Stack, Typography } from '@mui/material'
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined'
import { api, type FeedCard } from '../api'
import { errorMessage } from '../hooks'
import { useSession } from '../store/session'
import SwipeCard from '../feed/SwipeCard'
import { brand } from '../theme'

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; cards: FeedCard[] }

/** /feed: people to meet, one card after another. Swipe right for coffee, left to pass. */
export default function FeedPage() {
  // Remount (and refetch) whenever the acting user changes via the demo profile switcher.
  const currentUserId = useSession((s) => s.currentUserId)
  return <Feed key={currentUserId ?? 'none'} />
}

function Feed() {
  const navigate = useNavigate()
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [undo, setUndo] = useState<{ card: FeedCard; index: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const fetchFeed = useCallback(() => {
    let cancelled = false
    api
      .getFeed()
      .then((r) => !cancelled && setLoad({ status: 'ready', cards: r.cards }))
      .catch((e: unknown) => !cancelled && setLoad({ status: 'error', message: errorMessage(e) }))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => fetchFeed(), [fetchFeed])

  const cards = load.status === 'ready' ? load.cards : []

  function pass(card: FeedCard) {
    if (load.status !== 'ready') return
    const index = load.cards.findIndex((c) => c.id === card.id)
    setLoad({ status: 'ready', cards: load.cards.filter((c) => c.id !== card.id) })
    setUndo({ card, index })
    api.swipe(card.id, 'left').catch(() => {
      // Put the card back if the pass didn't save.
      setLoad((l) => (l.status === 'ready' ? { status: 'ready', cards: insertAt(l.cards, card, index) } : l))
      setUndo(null)
      setToast('Couldn’t save that pass. Please try again.')
    })
  }

  function undoPass() {
    if (!undo) return
    const { card, index } = undo
    setUndo(null)
    setLoad((l) => (l.status === 'ready' ? { status: 'ready', cards: insertAt(l.cards, card, index) } : l))
    api.undoSwipe(card.id).catch(() => setToast('Couldn’t undo. Please refresh.'))
  }

  return (
    // Extra room at the bottom while a notice is showing, so it never covers the last card's buttons.
    <Stack spacing={2.5} sx={{ pb: undo || toast ? 8 : 0, transition: 'padding 200ms' }}>
      <Box>
        <Typography variant="h4" component="h1">Feed</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Swipe right to ask for a coffee chat, or left to pass.
          {load.status === 'ready' && cards.length > 0 && (
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }} data-testid="feed-count">
              {' '}{cards.length} {cards.length === 1 ? 'person' : 'people'} to meet.
            </Box>
          )}
        </Typography>
      </Box>

      {load.status === 'loading' &&
        [0, 1].map((i) => <Skeleton key={i} variant="rounded" height={340} sx={{ borderRadius: 1 }} />)}

      {load.status === 'error' && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => { setLoad({ status: 'loading' }); fetchFeed() }}>Retry</Button>}>
          Couldn’t load your feed: {load.message}
        </Alert>
      )}

      {load.status === 'ready' && cards.length === 0 && (
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 6, border: `2px dashed ${brand.latte}`, borderRadius: 1 }} data-testid="feed-empty">
          <LocalCafeOutlinedIcon sx={{ fontSize: 48, color: 'secondary.main' }} />
          <Typography variant="h6" component="p">You’re all caught up</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 320 }}>
            You’ve seen everyone for now. Check back soon as more women join Drip.
          </Typography>
        </Stack>
      )}

      {cards.map((card) => (
        <SwipeCard key={card.id} card={card} onPass={pass} onCoffee={(c) => navigate(`/feed/request/${c.id}`)} />
      ))}

      <Snackbar
        open={undo !== null}
        autoHideDuration={6000}
        onClose={(_e, reason) => reason !== 'clickaway' && setUndo(null)}
        message={undo ? `Passed on ${undo.card.firstName}` : ''}
        action={<Button color="secondary" size="small" onClick={undoPass}>Undo</Button>}
        sx={{ bottom: { xs: 88 } }}
      />
      <Snackbar open={toast !== null} autoHideDuration={5000} onClose={() => setToast(null)} message={toast ?? ''} sx={{ bottom: { xs: 88 } }} />
    </Stack>
  )
}

function insertAt<T>(list: T[], item: T, index: number): T[] {
  const next = [...list]
  next.splice(Math.min(index, next.length), 0, item)
  return next
}
