import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Box, Skeleton, Stack, Tab, Tabs } from '@mui/material'
import { useSession } from '../store/session'
import { useOnboarding } from '../store/onboarding'
import { usePosts, useUser } from '../hooks'
import NotFoundPage from './NotFoundPage'
import { BioSection, PersonalitySection, PostsTab, ProfileHeader, ResumeTab } from '../profile/ProfileSections'
import { brand } from '../theme'

type TabName = 'resume' | 'posts'

/** /profile (you) or /profile/:id (someone else). */
export default function ProfilePage() {
  const params = useParams()
  const currentUserId = useSession((s) => s.currentUserId)
  const id = params.id !== undefined ? Number(params.id) : currentUserId
  const validId = id !== null && Number.isInteger(id) && id > 0
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: user, loading, error, notFound } = useUser(validId ? id : null, refreshKey)
  const posts = usePosts(validId ? id : null, currentUserId)
  const [search, setSearch] = useSearchParams()
  const tab: TabName = search.get('tab') === 'posts' ? 'posts' : 'resume'
  const location = useLocation()
  const navigate = useNavigate()
  const resetOnboarding = useOnboarding((s) => s.reset)
  const justSignedUp = (location.state as { justSignedUp?: boolean } | null)?.justSignedUp === true

  // Arriving from "Create account": the draft is now saved in the database, so clear it from this tab.
  useEffect(() => {
    if (!justSignedUp) return
    resetOnboarding()
    navigate(location.pathname + location.search, { replace: true, state: null })
  }, [justSignedUp, resetOnboarding, navigate, location.pathname, location.search])

  if (!validId || notFound) return <NotFoundPage />
  if (error) return <Alert severity="error">Couldn’t load this profile: {error}</Alert>
  if (loading && !user) {
    return (
      <Stack spacing={2} sx={{ pt: 2, alignItems: 'center' }}>
        <Skeleton variant="rounded" width={120} height={120} />
        <Skeleton width={220} height={44} />
        <Skeleton variant="rounded" width="100%" height={180} />
        <Skeleton variant="rounded" width="100%" height={220} />
      </Stack>
    )
  }
  if (!user) return null
  const isOwn = user.id === currentUserId

  return (
    <Stack spacing={{ xs: 2.5, md: 4 }}>
      {/* Desktop: photo + quick facts on the left, bio + "get to know" on the right. Phones: stacked. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' },
          gap: { xs: 2.5, md: 4 },
          alignItems: 'start',
        }}
      >
        <Box data-testid="profile-left">
          <ProfileHeader user={user} />
        </Box>
        <Stack spacing={2.5} data-testid="profile-right">
          <BioSection user={user} />
          <PersonalitySection user={user} isOwn={isOwn} onUpdated={() => setRefreshKey((k) => k + 1)} />
        </Stack>
      </Box>

      <Box>
        <Tabs
          value={tab}
          onChange={(_e, v: TabName) => setSearch(v === 'resume' ? {} : { tab: v }, { replace: true })}
          variant="fullWidth"
          sx={{
            borderBottom: 2, borderColor: 'primary.main', mb: 2,
            '& .MuiTab-root': { fontWeight: 700, letterSpacing: '0.1em' },
            '& .MuiTabs-indicator': { height: 4, bgcolor: brand.terracotta },
          }}
        >
          <Tab label="Resume" value="resume" />
          <Tab label={posts.data ? `Posts (${posts.data.length})` : 'Posts'} value="posts" />
        </Tabs>
        {tab === 'resume' ? (
          <ResumeTab text={user.resumeText} />
        ) : (
          <PostsTab posts={posts.data} loading={posts.loading} error={posts.error} isOwn={isOwn} firstName={user.firstName} />
        )}
      </Box>
    </Stack>
  )
}
