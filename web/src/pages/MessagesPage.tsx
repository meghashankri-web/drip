import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineRounded'
import Placeholder from '../components/Placeholder'

export default function MessagesPage() {
  return (
    <Placeholder title="Messages" step="Step 11" icon={<ChatBubbleOutlineIcon fontSize="inherit" />}>
      Coffee-chat requests, replies, and cheers will appear here.
    </Placeholder>
  )
}
