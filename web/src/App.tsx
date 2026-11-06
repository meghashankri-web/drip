import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import SignupLayout from './components/SignupLayout'
import FeedPage from './pages/FeedPage'
import RipplePage from './pages/RipplePage'
import MessagesPage from './pages/MessagesPage'
import ProfilePage from './pages/ProfilePage'
import SignupStepPage from './pages/SignupStepPage'
import NotFoundPage from './pages/NotFoundPage'
import RequestPage from './pages/RequestPage'

export default function App() {
  return (
    <Routes>
      <Route index element={<Navigate to="/feed" replace />} />
      <Route path="signup" element={<SignupLayout />}>
        <Route index element={<Navigate to="/signup/1" replace />} />
        <Route path=":step" element={<SignupStepPage />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route path="feed" element={<FeedPage />} />
        <Route path="feed/request/:userId" element={<RequestPage />} />
        <Route path="ripple" element={<RipplePage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/:id" element={<ProfilePage />} />
      </Route>
      <Route element={<SignupLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
