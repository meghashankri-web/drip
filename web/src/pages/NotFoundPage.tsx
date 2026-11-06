import { Link as RouterLink } from 'react-router-dom'
import { Button, Stack, Typography } from '@mui/material'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'

export default function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ py: 8, px: 2, alignItems: 'center', textAlign: 'center' }}>
      <WaterDropOutlinedIcon sx={{ fontSize: 56, color: 'secondary.main' }} />
      <Typography variant="h4" component="h1">
        Page not found
      </Typography>
      <Typography color="text.secondary">This page spilled. Let’s get you back to your feed.</Typography>
      <Button variant="contained" component={RouterLink} to="/feed">
        Go to Feed
      </Button>
    </Stack>
  )
}
