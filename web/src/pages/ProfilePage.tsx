import { useParams } from 'react-router-dom'
import { Alert, Avatar, Card, CardContent, Chip, Skeleton, Stack, Typography } from '@mui/material'
import WavesIcon from '@mui/icons-material/Waves'
import { useSession } from '../store/session'
import { useUser } from '../hooks'
import NotFoundPage from './NotFoundPage'

/** /profile (you) or /profile/:id (someone else). The full profile arrives in Step 7. */
export default function ProfilePage() {
  const params = useParams()
  const currentUserId = useSession((s) => s.currentUserId)
  const id = params.id !== undefined ? Number(params.id) : currentUserId
  const validId = id !== null && Number.isInteger(id) && id > 0
  const { data: user, loading, error, notFound } = useUser(validId ? id : null)

  if (!validId || notFound) return <NotFoundPage />
  if (error) return <Alert severity="error">Couldn’t load this profile: {error}</Alert>
  if (loading || !user) {
    return (
      <Stack spacing={2} sx={{ pt: 2, alignItems: 'center' }}>
        <Skeleton variant="circular" width={112} height={112} />
        <Skeleton width={180} height={40} />
        <Skeleton variant="rounded" width="100%" height={120} />
      </Stack>
    )
  }

  const place = user.city && user.state ? `${user.city}, ${user.state}` : user.zip

  return (
    <Stack spacing={2}>
      <Stack spacing={1} sx={{ pt: 1, alignItems: 'center' }}>
        <Avatar src={user.photoUrl ?? undefined} alt="" sx={{ width: 112, height: 112 }} />
        <Typography variant="h4" component="h1" sx={{ textAlign: 'center' }}>
          {user.firstName} {user.lastName}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <Chip
            icon={<WavesIcon />}
            label={`${user.rippleCount} ${user.rippleCount === 1 ? 'ripple' : 'ripples'}`}
            color="primary"
          />
          <Chip label={user.careerStage} variant="outlined" />
          <Chip label={place} variant="outlined" />
          {user.raceCulture && <Chip label={user.raceCulture} variant="outlined" />}
        </Stack>
      </Stack>
      {user.summary && (
        <Card>
          <CardContent>
            <Typography>{user.summary}</Typography>
          </CardContent>
        </Card>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        Full profile, resume, and posts coming in Step 7.
      </Typography>
    </Stack>
  )
}
