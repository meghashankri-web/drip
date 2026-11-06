import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppBar, BottomNavigation, BottomNavigationAction, Box, Paper, Toolbar } from '@mui/material'
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined'
import WavesIcon from '@mui/icons-material/Waves'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineRounded'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineRounded'
import Logo from './Logo'
import ProfileSwitcher from './ProfileSwitcher'
import ChooseProfile from './ChooseProfile'
import { useSession } from '../store/session'
import { CONTENT_MAX_WIDTH } from '../constants'

const TABS = [
  { label: 'Feed', path: '/feed', icon: <LocalCafeOutlinedIcon /> },
  { label: 'Ripple', path: '/ripple', icon: <WavesIcon /> },
  { label: 'Messages', path: '/messages', icon: <ChatBubbleOutlineIcon /> },
  { label: 'Profile', path: '/profile', icon: <PersonOutlineIcon /> },
] as const

/** Main app chrome: brand app bar on top, tab bar on the bottom. Not used during sign-up. */
export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUserId = useSession((s) => s.currentUserId)

  const activeTab = TABS.findIndex((t) => location.pathname === t.path || location.pathname.startsWith(`${t.path}/`))

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" color="primary">
        <Toolbar sx={{ maxWidth: CONTENT_MAX_WIDTH, width: '100%', mx: 'auto', px: { xs: 2 } }}>
          <Box component={RouterLink} to="/feed" aria-label="Drip home" sx={{ display: 'flex' }}>
            <Logo height={34} />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <ProfileSwitcher />
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{ flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, mx: 'auto', px: 2, pt: 2, pb: 12 }}
      >
        {currentUserId === null ? <ChooseProfile /> : <Outlet />}
      </Box>

      <Paper
        component="nav"
        aria-label="Main"
        square
        sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: (t) => t.zIndex.appBar,
          borderTop: 1, borderColor: 'divider', pb: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigation
          showLabels
          value={activeTab === -1 ? false : activeTab}
          onChange={(_e, i: number) => navigate(TABS[i]!.path)}
          sx={{ maxWidth: CONTENT_MAX_WIDTH, mx: 'auto' }}
        >
          {TABS.map((t) => (
            <BottomNavigationAction key={t.path} label={t.label} icon={t.icon} />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  )
}
