import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar, Box, Button, Divider, ListItemAvatar, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem,
  Typography,
} from '@mui/material'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckIcon from '@mui/icons-material/Check'
import { useSession } from '../store/session'
import { useCurrentUser, useUserList } from '../hooks'
import { brand } from '../theme'

/** Demo-only control: lets one browser act as any user. */
export default function ProfileSwitcher() {
  const navigate = useNavigate()
  const currentUserId = useSession((s) => s.currentUserId)
  const setCurrentUserId = useSession((s) => s.setCurrentUserId)
  const { data: me } = useCurrentUser()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [openCount, setOpenCount] = useState(0) // refetch the list each time the menu opens
  const users = useUserList(openCount)

  const open = (el: HTMLElement) => {
    setOpenCount((n) => n + 1)
    setAnchor(el)
  }
  const choose = (id: number) => {
    setCurrentUserId(id)
    setAnchor(null)
  }

  return (
    <>
      <Button
        onClick={(e) => open(e.currentTarget)}
        aria-label="Switch demo profile"
        aria-haspopup="menu"
        endIcon={<ExpandMoreIcon />}
        sx={{
          color: brand.cream, pl: 0.75, pr: 1.25, border: `1.5px solid ${brand.cream}`, borderRadius: 1,
          '&:hover': { bgcolor: 'rgba(252,249,242,0.12)' },
        }}
      >
        <Avatar src={me?.photoUrl ?? undefined} alt="" sx={{ width: 30, height: 30, mr: 1, bgcolor: brand.latte }}>
          {me?.firstName[0]}
        </Avatar>
        <Typography component="span" noWrap sx={{ maxWidth: 120, fontWeight: 600 }}>
          {me ? me.firstName : 'Profiles'}
        </Typography>
      </Button>

      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { maxHeight: 440, width: 280 } } }}
      >
        <ListSubheader sx={{ lineHeight: 2.5, fontWeight: 700, color: 'text.secondary' }}>
          Demo: act as…
        </ListSubheader>
        {users.loading && !users.data && <MenuItem disabled>Loading…</MenuItem>}
        {users.error && <MenuItem disabled>Couldn’t load users</MenuItem>}
        {users.data?.map((u) => (
          <MenuItem key={u.id} selected={u.id === currentUserId} onClick={() => choose(u.id)}>
            <ListItemAvatar sx={{ minWidth: 44 }}>
              <Avatar src={u.photoUrl ?? undefined} alt="" sx={{ width: 32, height: 32 }} />
            </ListItemAvatar>
            <ListItemText
              primary={`${u.firstName} ${u.lastName}`}
              secondary={u.careerStage}
              slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
            />
            {u.id === currentUserId && (
              <Box component="span" sx={{ display: 'flex', ml: 1, color: 'primary.main' }}>
                <CheckIcon fontSize="small" />
              </Box>
            )}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            // Sign out of the demo profile and show the welcome (landing) screen.
            setAnchor(null)
            setCurrentUserId(null)
            navigate('/feed')
          }}
        >
          <ListItemIcon>
            <PersonAddAlt1Icon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Sign up as a new member" />
        </MenuItem>
      </Menu>
    </>
  )
}
