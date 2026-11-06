/** Typed client for the Drip API. All requests go through Vite's /api proxy. */

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

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message)
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
  lookupZip: (zip: string) => request<ZipInfo>(`/zips/${encodeURIComponent(zip)}`),
  analyzeResume: (file: File) => {
    const body = new FormData()
    body.append('resume', file)
    return request<ResumeAnalysis>('/resume/analyze', { method: 'POST', body })
  },
  emailAvailable: (email: string) =>
    request<{ available: boolean }>(`/users/email-available?email=${encodeURIComponent(email)}`),
}
