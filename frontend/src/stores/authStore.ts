import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResult, ParticipantLoginResult } from '../types/api'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  participantToken: string | null
  principalType: AuthResult['principalType'] | null
  displayName: string | null
  role: string | null
  isAuthenticated: () => boolean
  setAuth: (auth: AuthResult) => void
  setParticipant: (result: ParticipantLoginResult, rawToken: string) => void
  setAccessToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      participantToken: null,
      principalType: null,
      displayName: null,
      role: null,
      isAuthenticated: () => Boolean(get().accessToken),
      setAuth: (auth) =>
        set({
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          participantToken: null,
          principalType: auth.principalType,
          displayName: auth.displayName,
          role: auth.role,
        }),
      setParticipant: (result, rawToken) =>
        set({
          accessToken: result.accessToken,
          refreshToken: null,
          participantToken: rawToken,
          principalType: 'Participant',
          displayName: `${result.firstName} ${result.lastName}`.trim(),
          role: null,
        }),
      setAccessToken: (token) => set({ accessToken: token }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          participantToken: null,
          principalType: null,
          displayName: null,
          role: null,
        }),
    }),
    { name: 'eventpulse-auth' },
  ),
)
