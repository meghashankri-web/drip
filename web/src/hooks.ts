import { useEffect, useState } from 'react'
import { api, ApiError, type UserProfile, type UserSummary } from './api'
import { useSession } from './store/session'

export type Loadable<T> = { data: T | null; loading: boolean; error: string | null; notFound: boolean }

const idle = { data: null, loading: false, error: null, notFound: false }

/** Runs an API call and tracks its loading / error state. Re-runs when `key` changes. */
function useLoad<T>(key: string | null, load: () => Promise<T>): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>(key === null ? idle : { ...idle, loading: true })

  useEffect(() => {
    if (key === null) {
      setState(idle)
      return
    }
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null, notFound: false }))
    load()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null, notFound: false })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const notFound = e instanceof ApiError && e.status === 404
        setState({ data: null, loading: false, error: errorMessage(e), notFound })
      })
    return () => {
      cancelled = true
    }
    // `load` is intentionally keyed by `key` so callers can pass inline functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}

export function useUser(id: number | null): Loadable<UserProfile> {
  return useLoad(id === null ? null : `user:${id}`, () => api.getUser(id!))
}

/** The signed-in user. Clears the session if that user no longer exists (e.g. after a demo reset). */
export function useCurrentUser(): Loadable<UserProfile> {
  const currentUserId = useSession((s) => s.currentUserId)
  const setCurrentUserId = useSession((s) => s.setCurrentUserId)
  const state = useUser(currentUserId)

  useEffect(() => {
    if (state.notFound) setCurrentUserId(null)
  }, [state.notFound, setCurrentUserId])

  return state
}

export function useUserList(refreshKey = 0): Loadable<UserSummary[]> {
  return useLoad(`users:${refreshKey}`, () => api.listUsers())
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return 'Something went wrong'
}
