import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SessionState {
  /** The user the app is acting as. Mock auth: set by sign-up or the demo profile switcher. */
  currentUserId: number | null
  setCurrentUserId: (id: number | null) => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      currentUserId: null,
      setCurrentUserId: (currentUserId) => set({ currentUserId }),
    }),
    { name: 'drip-session' },
  ),
)
