import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import Logo from './Logo'
import { CONTENT_MAX_WIDTH } from '../constants'

/** Sign-up chrome: brand header, no bottom navigation. */
export default function SignupLayout() {
  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <Box sx={{ bgcolor: 'primary.main', py: 2, display: 'flex', justifyContent: 'center' }}>
        <Logo height={44} />
      </Box>
      <Box component="main" sx={{ maxWidth: CONTENT_MAX_WIDTH, mx: 'auto', px: 2, py: 3 }}>
        <Outlet />
      </Box>
    </Box>
  )
}
