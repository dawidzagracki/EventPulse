import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { AgendaItemDto, MyProfileDto, ParticipantLoginResult, TransferDto } from '../../types/api'

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

export function useRsvp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (attending: boolean) =>
      (await api.post<MyProfileDto>('/api/me/rsvp', { attending })).data,
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

export function useMyTransfers() {
  return useQuery({
    queryKey: ['me', 'transfers'],
    queryFn: async () => (await api.get<TransferDto[]>('/api/me/transfers')).data,
  })
}

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async (body: { rating: number; comment: string | null }) => {
      await api.post('/api/me/feedback', body)
    },
  })
}
