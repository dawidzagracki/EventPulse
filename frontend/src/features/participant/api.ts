import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type {
  AgendaItemDto,
  CompanionDto,
  CustomFieldDto,
  MyProfileDto,
  OnboardingStepDto,
  ParticipantLoginResult,
  TransferDto,
} from '../../types/api'

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

export interface MyEventDto {
  id: string
  name: string
  status: number
  startsAt: string
  endsAt: string
  location: string | null
  description: string | null
  usesLocationData: boolean
  phoneRequired: boolean
  allowCompanions: boolean
  maxCompanions: number
  customPhotosUrl: string | null
  customPhotosText: string | null
}

export function useMyEvent() {
  return useQuery({
    queryKey: ['me', 'event'],
    queryFn: async () => (await api.get<MyEventDto>('/api/me/event')).data,
  })
}

export interface ConsentsInput {
  rodoAccepted: boolean
  photoConsent: boolean
  networkingConsent: boolean
  phone?: string | null
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

export interface SelfScanResult {
  stationCode: string
  duplicate: boolean
  limitReached?: boolean
  allowed?: boolean
}

/** Guest records presence at a station they scanned. clientId makes it idempotent. */
export async function recordStationScan(stationCode: string): Promise<SelfScanResult> {
  const { data } = await api.post<SelfScanResult>('/api/me/scans', {
    stationCode,
    clientId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
  })
  return data
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

// ---- Custom fields (participant) ----
export function useMyCustomFields() {
  return useQuery({
    queryKey: ['me', 'custom-fields'],
    queryFn: async () => (await api.get<CustomFieldDto[]>('/api/me/custom-fields')).data,
  })
}

export function useSaveMyCustomFields() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Record<string, string>) => {
      await api.put('/api/me/custom-fields', values)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
}

// ---- Accompanying persons (participant) ----
export function useMyCompanions() {
  return useQuery({
    queryKey: ['me', 'companions'],
    queryFn: async () => (await api.get<CompanionDto[]>('/api/me/companions')).data,
  })
}

export function useAddCompanion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { firstName: string; lastName: string; age: number | null }) =>
      (await api.post<CompanionDto>('/api/me/companions', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'companions'] }),
  })
}

export function useDeleteCompanion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/me/companions/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'companions'] }),
  })
}

// ---- Onboarding (participant) ----
export function useMyOnboarding() {
  return useQuery({
    queryKey: ['me', 'onboarding'],
    queryFn: async () => (await api.get<OnboardingStepDto[]>('/api/me/onboarding')).data,
  })
}

export function useCompleteOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/api/me/onboarding/complete')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
}
