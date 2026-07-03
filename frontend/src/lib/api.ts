import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../stores/authStore'
import type { AuthResult, ParticipantLoginResult } from '../types/api'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export const api = axios.create({ baseURL })

/**
 * Resolves an asset URL for use in <img src>. App-relative URLs (e.g. an uploaded
 * logo served from "/api/public/...") get the API base prepended so they load in
 * local dev (cross-origin) and prod (same-origin); absolute http(s) URLs pass through.
 */
export function assetUrl(url?: string | null): string | null | undefined {
  if (!url) return url
  return url.startsWith('/') ? `${baseURL}${url}` : url
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Single-flight refresh so concurrent 401s don't trigger multiple refreshes.
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, participantToken } = useAuthStore.getState()

  try {
    // Agency/client: rotate refresh token.
    if (refreshToken) {
      const { data } = await axios.post<AuthResult>(`${baseURL}/api/auth/refresh`, { refreshToken })
      useAuthStore.getState().setAuth(data)
      return data.accessToken
    }

    // Participant: re-exchange the long-lived token from the invitation link.
    if (participantToken) {
      const { data } = await axios.post<ParticipantLoginResult>(`${baseURL}/api/auth/participant`, {
        token: participantToken,
      })
      useAuthStore.getState().setParticipant(data, participantToken)
      return data.accessToken
    }

    return null
  } catch {
    useAuthStore.getState().logout()
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      refreshing ??= refreshAccessToken()
      const token = await refreshing
      refreshing = null

      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
    }

    return Promise.reject(error)
  },
)
