import { Link as RouterLink, useParams } from 'react-router-dom'
import { Avatar, Button, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material'
import { useUser } from '../hooks'
import NotFoundPage from './NotFoundPage'
import { brand, hardShadow } from '../theme'

/** /feed/request/:userId: the coffee-chat request flow. Placeholder until Step 10. */
export default function RequestPage() {
  const id = Number(useParams().userId)
  const valid = Number.isInteger(id) && id > 0
  const { data: user, loading, notFound } = useUser(valid ? id : null)
  if (!valid || notFound) return <NotFoundPage />
  if (loading || !user) return <Skeleton variant="rounded" height={240} />
  return (
    <Stack spacing={2.5} data-testid="request-page">
      <Typography variant="h4" component="h1">Coffee with {user.firstName}?</Typography>
      <Card>
        <CardContent>
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
            <Avatar src={user.photoUrl ?? undefined} alt="" sx={{ width: 96, height: 96, border: 2, borderColor: 'primary.main', boxShadow: hardShadow(3, brand.terracotta) }} />
            <Typography>
              The request form (your message, availability, and what you have in common) is coming in Step 10.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
      <Button component={RouterLink} to="/feed" sx={{ alignSelf: 'flex-start' }}>Back to feed</Button>
    </Stack>
  )
}
