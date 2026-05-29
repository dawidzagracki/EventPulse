import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResult } from '../types/api'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  principalType: AuthResult['principalType'] | null
  displayName: string | null
  role: string | null
  isAuthenticated: () => boolean
  setAuth: (auth: AuthResult) => void
  setAccessToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      principalType: null,
      displayName: null,
      role: null,
      isAuthenticated: () => Boolean(get().accessToken),
      setAuth: (auth) =>
        set({
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          principalType: auth.principalType,
          displayName: auth.displayName,
          role: auth.role,
        }),
      setAccessToken: (token) => set({ accessToken: token }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          principalType: null,
          displayName: null,
          role: null,
        }),
    }),
    { name: 'eventpulse-auth' },
  ),
)
