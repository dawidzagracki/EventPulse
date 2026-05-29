import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { AgendaItemDto, MyProfileDto, ParticipantLoginResult } from '../../types/api'

export async function exchangeToken(token: string): Promise<ParticipantLoginResult> {
  const { data } = await api.post<ParticipantLoginResult>('/api/auth/participant', { token })
  return data
}

export function useMyProfile() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<MyProfileDto>('/api/me')).data,
  })
}

export interface ConsentsInput {
  rodoAccepted: boolean
  photoConsent: boolean
  networkingConsent: boolean
}

export function useUpdateConsents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ConsentsInput) => (await api.post<MyProfileDto>('/api/me/consents', input)).data,
    onSuccess: (data) => qc.setQueryData(['me'], data),
  })
}

export interface PreferencesInput {
  language: string
  dietaryPreferences: string | null
  shirtSize: string | null
  wishes: string | null
  airportTransfer: boolean
  arrivalTime: string | null
  flightNumber: string | null
}

export function useUpdatePreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PreferencesInput) => (await api.put<MyProfileDto>('/api/me/preferences', input)).data,
    onSuccess: (data) => qc.setQueryData(['me'], data),
  })
}

export function useMyAgenda() {
  return useQuery({
    queryKey: ['me', 'agenda'],
    queryFn: async () => (await api.get<AgendaItemDto[]>('/api/me/agenda')).data,
  })
}
