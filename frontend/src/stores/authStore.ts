import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResult, ParticipantLoginResult } from '../types/api'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  participantToken: string | null
  principalType: AuthResult['principalType'] | 'Operator' | null
  displayName: string | null
  role: string | null
  eventId: string | null
  isAuthenticated: () => boolean
  setAuth: (auth: AuthResult) => void
  setParticipant: (result: ParticipantLoginResult, rawToken: string) => void
  setOperator: (accessToken: string, eventId: string, eventName: string) => void
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
      eventId: null,
      isAuthenticated: () => Boolean(get().accessToken),
      setAuth: (auth) =>
        set({
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          participantToken: null,
          principalType: auth.principalType,
          displayName: auth.displayName,
          role: auth.role,
          eventId: null,
        }),
      setParticipant: (result, rawToken) =>
        set({
          accessToken: result.accessToken,
          refreshToken: null,
          participantToken: rawToken,
          principalType: 'Participant',
          displayName: `${result.firstName} ${result.lastName}`.trim(),
          role: null,
          eventId: null,
        }),
      setOperator: (accessToken, eventId, eventName) =>
        set({
          accessToken,
          refreshToken: null,
          participantToken: null,
          principalType: 'Operator',
          displayName: `Operator · ${eventName}`,
          role: null,
          eventId,
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
          eventId: null,
        }),
    }),
    { name: 'eventpulse-auth' },
  ),
)
