import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Stack, Typography } from '@mui/material'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'

/** Shown in the main app when nobody is signed in yet. */
export default function ChooseProfile() {
  return (
    <Stack spacing={2} sx={{ py: 8, alignItems: 'center', textAlign: 'center' }}>
      <Box sx={{ color: 'secondary.main' }}>
        <WaterDropOutlinedIcon sx={{ fontSize: 56 }} />
      </Box>
      <Typography variant="h4" component="h1">
        Welcome to Drip
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 360 }}>
        Where women pour it forward. Sign up to start meeting women for coffee chats, or use the
        profile menu at the top right to explore as a demo member.
      </Typography>
      <Button variant="contained" size="large" component={RouterLink} to="/signup/1">
        Sign up
      </Button>
    </Stack>
  )
}
