import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CareerStage } from '../api'

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

/** Sign-up Step 2: resume + Claude's analysis, as edited by the user. */
export interface ResumeDraft {
  /** Uploaded file saved on the server (null when entered by hand). */
  file: { id: string; name: string } | null
  source: 'claude' | 'manual'
  summary: string
  experienceTags: string[]
  careerStage: CareerStage | null
  resumeText: string
}

/** Cached interest suggestions, keyed by the inputs that produced them. */
export interface InterestSuggestions {
  key: string
  items: string[]
  source: 'claude' | 'static'
}

interface OnboardingState {
  basics: BasicsDraft
  resume: ResumeDraft | null
  /** Sign-up Step 3: what she wants to learn, in rank order (index 0 = rank 1). */
  interests: string[]
  interestSuggestions: InterestSuggestions | null
  setBasics: (patch: Partial<BasicsDraft>) => void
  setResume: (resume: ResumeDraft | null) => void
  updateResume: (patch: Partial<ResumeDraft>) => void
  setInterests: (interests: string[]) => void
  setInterestSuggestions: (s: InterestSuggestions | null) => void
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
      resume: null,
      interests: [],
      interestSuggestions: null,
      setBasics: (patch) => set((s) => ({ basics: { ...s.basics, ...patch } })),
      setResume: (resume) => set({ resume }),
      updateResume: (patch) => set((s) => (s.resume ? { resume: { ...s.resume, ...patch } } : s)),
      setInterests: (interests) => set({ interests }),
      setInterestSuggestions: (interestSuggestions) => set({ interestSuggestions }),
      reset: () => set({ basics: emptyBasics, resume: null, interests: [], interestSuggestions: null }),
    }),
    { name: 'drip-onboarding', storage: createJSONStorage(() => sessionStorage) },
  ),
)
