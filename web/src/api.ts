/** Typed client for the Drip API. All requests go through Vite's /api proxy. */
import { useSession } from './store/session'

export type CareerStage = 'Student' | 'Early career' | 'Mid-career' | 'Senior' | 'Executive' | 'Founder'
export type MeetingPref = 'in_person' | 'zoom' | 'either'

export interface UserSummary {
  id: number
  firstName: string
  lastName: string
  photoUrl: string | null
  careerStage: CareerStage
}

export interface UserProfile extends UserSummary {
  raceCulture: string | null
  zip: string
  city: string | null
  state: string | null
  summary: string | null
  resumeText: string | null
  hobbies: string | null
  bestAdvice: string | null
  womanAdmired: string | null
  askMeAbout: string | null
  meetingPref: MeetingPref
  chatsPerMonth: number
  experienceTags: string[]
  interestTags: string[]
  rippleCount: number
  createdAt: string
}

export interface Post {
  id: number
  photoUrl: string | null
  caption: string | null
  createdAt: string
  partner: { id: number; firstName: string; lastName: string; photoUrl: string | null }
  cheeredByViewer: boolean
  /** Only present when the viewer is the post's author (cheers totals are private). */
  cheersCount?: number
}

export interface CreateUserBody {
  basics: {
    firstName: string; lastName: string; email: string; password: string; zip: string; birthYear: number
    photoDataUrl: string; raceCulture: string; is18Plus: true; identifiesAsWoman: true
  }
  resume: { fileId: string | null; summary: string; experienceTags: string[]; careerStage: CareerStage; resumeText: string }
  interests: string[]
  personality: {
    hobbies: string; bestAdvice: string; womanAdmired: string; askMeAbout: string
    meetingPref: MeetingPref; chatsPerMonth: number
  }
}

export class ApiError extends Error {
  readonly status: number
  /** Sign-up step to return to, when the server points at one. */
  readonly step?: number
  constructor(status: number, message: string, step?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.step = step
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Mock auth: tell the server who is acting (set by sign-up or the demo profile switcher).
  const viewer = useSession.getState().currentUserId
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(viewer !== null ? { 'X-Drip-User': String(viewer) } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    let message = res.statusText
    let step: number | undefined
    try {
      const body = (await res.json()) as { error?: string; step?: number }
      if (body.error) message = body.error
      step = body.step
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message, step)
  }
  return (await res.json()) as T
}

export interface ResumeAnalysis {
  summary: string
  experienceTags: string[]
  careerStage: CareerStage
  resumeText: string
  file: { id: string; name: string }
}

export interface ZipInfo {
  zip: string
  city: string
  state: string
}

export const api = {
  health: () => request<{ ok: boolean }>('/health'),
  listUsers: () => request<UserSummary[]>('/users'),
  getUser: (id: number) => request<UserProfile>(`/users/${id}`),
  listPosts: (authorId: number) => request<Post[]>(`/users/${authorId}/posts`),
  createUser: (body: CreateUserBody) =>
    request<{ id: number }>('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  updatePreferences: (id: number, body: { chatsPerMonth: number }) =>
    request<{ chatsPerMonth: number }>(`/users/${id}/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  lookupZip: (zip: string) => request<ZipInfo>(`/zips/${encodeURIComponent(zip)}`),
  analyzeResume: (file: File) => {
    const body = new FormData()
    body.append('resume', file)
    return request<ResumeAnalysis>('/resume/analyze', { method: 'POST', body })
  },
  suggestInterests: (body: { experienceTags: string[]; careerStage: CareerStage; summary?: string }) =>
    request<{ suggestions: string[]; source: 'claude' | 'static' }>('/interests/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  emailAvailable: (email: string) =>
    request<{ available: boolean }>(`/users/email-available?email=${encodeURIComponent(email)}`),
}
