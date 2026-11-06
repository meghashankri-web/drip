import type { ReactNode } from 'react'
import { Card, CardContent, Stack, Typography } from '@mui/material'

/** Temporary page body for tabs that later build steps fill in. */
export default function Placeholder(props: { title: string; step: string; icon: ReactNode; children?: ReactNode }) {
  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">
        {props.title}
      </Typography>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Stack sx={{ color: 'secondary.main', fontSize: 40 }}>{props.icon}</Stack>
            <Stack spacing={0.5}>
              <Typography sx={{ fontWeight: 600 }}>{props.children}</Typography>
              <Typography variant="body2" color="text.secondary">
                Coming in {props.step}.
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
