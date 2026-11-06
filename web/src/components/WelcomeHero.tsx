import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Stack, Typography } from '@mui/material'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'

/** Drip's landing content: welcome, tagline, and the Sign up call to action. */
export default function WelcomeHero({ children }: { children: ReactNode }) {
  return (
    <Stack spacing={2} sx={{ py: 8, alignItems: 'center', textAlign: 'center' }}>
      <Box sx={{ color: 'secondary.main' }}>
        <WaterDropOutlinedIcon sx={{ fontSize: 56 }} />
      </Box>
      <Typography variant="h4" component="h1">
        Welcome to Drip
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 360 }}>
        {children}
      </Typography>
      <Button variant="contained" size="large" component={RouterLink} to="/signup/1">
        Sign up
      </Button>
    </Stack>
  )
}
