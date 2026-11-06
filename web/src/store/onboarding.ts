import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Sign-up Step 1 answers. */
export interface BasicsDraft {
  firstName: string
  lastName: string
  email: string
  password: string
  zip: string
  birthYear: number | null
  /** Downscaled JPEG data URL (≤512px), so it fits in sessionStorage and survives a refresh. */
  photoDataUrl: string | null
  raceCulture: string
  is18Plus: boolean
  identifiesAsWoman: boolean
}

export const emptyBasics: BasicsDraft = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  zip: '',
  birthYear: null,
  photoDataUrl: null,
  raceCulture: '',
  is18Plus: false,
  identifiesAsWoman: false,
}

interface OnboardingState {
  basics: BasicsDraft
  setBasics: (patch: Partial<BasicsDraft>) => void
  reset: () => void
}

/**
 * The in-progress sign-up. Kept in sessionStorage (per browser tab) so going Back/Next — or
 * refreshing — never loses input; cleared once the account is created.
 */
export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      basics: emptyBasics,
      setBasics: (patch) => set((s) => ({ basics: { ...s.basics, ...patch } })),
      reset: () => set({ basics: emptyBasics }),
    }),
    { name: 'drip-onboarding', storage: createJSONStorage(() => sessionStorage) },
  ),
)
