import { useState } from 'react'
import { Box, Button, Chip, FormHelperText, Stack, TextField } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { cleanTag, TAG_MAX_LENGTH } from '../signup/resume'

interface TagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  max: number
  /** Accessible name for the group, e.g. "Experience tags". */
  label: string
  addPlaceholder?: string
}

/** Chips that can be deleted, edited (tap a chip), and added to. */
export default function TagEditor({ tags, onChange, max, label, addPlaceholder = 'Add a tag' }: TagEditorProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ index: number; value: string } | null>(null)
  const full = tags.length >= max

  function add() {
    if (full) {
      setError(`You can have up to ${max} tags`)
      return
    }
    const result = cleanTag(draft, tags)
    if ('error' in result) {
      setError(result.error)
      return
    }
    onChange([...tags, result.tag])
    setDraft('')
    setError(null)
  }

  function saveEdit() {
    if (!editing) return
    const result = cleanTag(editing.value, tags, editing.index)
    if ('error' in result) {
      // An emptied tag while editing means "delete it".
      if (!editing.value.trim()) onChange(tags.filter((_, i) => i !== editing.index))
      else {
        setError(result.error)
        return
      }
    } else {
      onChange(tags.map((t, i) => (i === editing.index ? result.tag : t)))
    }
    setEditing(null)
    setError(null)
  }

  return (
    <Stack spacing={1.5}>
      <Box role="group" aria-label={label} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {tags.map((tag, i) =>
          editing?.index === i ? (
            <TextField
              key={`edit-${i}`}
              size="small"
              autoFocus
              value={editing.value}
              onChange={(e) => setEditing({ index: i, value: e.target.value })}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveEdit()
                } else if (e.key === 'Escape') {
                  setEditing(null)
                  setError(null)
                }
              }}
              slotProps={{ htmlInput: { 'aria-label': `Edit tag ${tag}`, maxLength: TAG_MAX_LENGTH + 10 } }}
              sx={{ width: Math.max(140, editing.value.length * 9 + 40) }}
            />
          ) : (
            <Chip
              key={`${tag}-${i}`}
              label={tag}
              color="primary"
              variant="outlined"
              onClick={() => {
                setEditing({ index: i, value: tag })
                setError(null)
              }}
              onDelete={() => onChange(tags.filter((_, j) => j !== i))}
              aria-label={`${tag}. Tap to edit`}
              sx={{ textTransform: 'none', fontSize: '0.8rem', letterSpacing: 0 }}
            />
          ),
        )}
      </Box>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          placeholder={full ? `Maximum of ${max} tags` : addPlaceholder}
          value={draft}
          disabled={full}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          slotProps={{ htmlInput: { 'aria-label': 'New tag', maxLength: TAG_MAX_LENGTH + 10 } }}
        />
        <Button variant="outlined" onClick={add} disabled={full} startIcon={<AddIcon />} sx={{ flexShrink: 0 }}>
          Add
        </Button>
      </Stack>
      {error && <FormHelperText error sx={{ m: 0 }}>{error}</FormHelperText>}
    </Stack>
  )
}
