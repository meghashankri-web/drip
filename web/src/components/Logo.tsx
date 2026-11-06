import { Box } from '@mui/material'

/** The "drip" wordmark (cream on transparent), cropped from the full logo. */
export default function Logo({ height = 32 }: { height?: number }) {
  return (
    <Box
      component="img"
      src="/logo-wordmark.svg"
      alt="Drip"
      sx={{ height, width: 'auto', display: 'block' }}
    />
  )
}
