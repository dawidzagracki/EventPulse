import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type {
  CreateEventRequest,
  CustomFieldDto,
  CustomFieldInput,
  EventDto,
  EventSettingsDto,
  OnboardingStepDto,
  OnboardingStepInput,
} from '../../types/api'

const KEY = ['events']

async function listEvents(): Promise<EventDto[]> {
  const { data } = await api.get<EventDto[]>('/api/events')
  return data
}

async function createEvent(body: CreateEventRequest): Promise<EventDto> {
  const { data } = await api.post<EventDto>('/api/events', body)
  return data
}

export function useEvents() {
  return useQuery({ queryKey: KEY, queryFn: listEvents })
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId],
    queryFn: async () => (await api.get<EventDto>(`/api/events/${eventId}`)).data,
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export interface UpdateEventRequest {
  name: string
  startsAt: string
  endsAt: string
  location?: string | null
  description?: string | null
  defaultLanguage?: string | null
  clientEmail?: string | null
}

export function useUpdateEvent(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdateEventRequest) =>
      (await api.put<EventDto>(`/api/events/${eventId}`, body)).data,
    onSuccess: (data) => {
      qc.setQueryData(['events', eventId], data)
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}

export type UpdateEventSettingsRequest = Omit<EventSettingsDto, 'anonymizedAt'>

export function useUpdateEventSettings(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdateEventSettingsRequest) =>
      (await api.put<EventDto>(`/api/events/${eventId}/settings`, body)).data,
    onSuccess: (data) => {
      qc.setQueryData(['events', eventId], data)
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}

// ---- Transactional e-mail branding ----
export interface UpdateEmailBrandingRequest {
  accentColor: string | null
  logoUrl: string | null
  headerName: string | null
  fromName: string | null
  subject: string | null
}

export function useUpdateEmailBranding(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdateEmailBrandingRequest) =>
      (await api.put<EventDto>(`/api/events/${eventId}/email-branding`, body)).data,
    onSuccess: (data) => {
      qc.setQueryData(['events', eventId], data)
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}

/** Fetches the live e-mail HTML preview (auth-scoped) for the given draft branding. */
export async function fetchEmailPreview(
  eventId: string,
  accent: string | null,
  logo: string | null,
  header: string | null,
): Promise<string> {
  const { data } = await api.get<string>(`/api/events/${eventId}/email/preview`, {
    params: { accent: accent ?? undefined, logo: logo || undefined, header: header || undefined },
    responseType: 'text',
    transformResponse: (v) => v,
  })
  return data
}

// ---- Custom fields (admin) ----
export function useCustomFields(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'custom-fields'],
    queryFn: async () => (await api.get<CustomFieldDto[]>(`/api/events/${eventId}/custom-fields`)).data,
  })
}

export function useSaveCustomFields(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fields: CustomFieldInput[]) =>
      (await api.put<CustomFieldDto[]>(`/api/events/${eventId}/custom-fields`, { fields })).data,
    onSuccess: (data) => qc.setQueryData(['events', eventId, 'custom-fields'], data),
  })
}

// ---- Onboarding (admin) ----
export function useOnboarding(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'onboarding'],
    queryFn: async () => (await api.get<OnboardingStepDto[]>(`/api/events/${eventId}/onboarding`)).data,
  })
}

export function useSaveOnboarding(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (steps: OnboardingStepInput[]) =>
      (await api.put<OnboardingStepDto[]>(`/api/events/${eventId}/onboarding`, { steps })).data,
    onSuccess: (data) => qc.setQueryData(['events', eventId, 'onboarding'], data),
  })
}

export function useUpdateEventSlug(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (slug: string) =>
      (await api.put<EventDto>(`/api/events/${eventId}/slug`, { slug })).data,
    onSuccess: (data) => {
      qc.setQueryData(['events', eventId], data)
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}

// ---- Client account access (which client logins may open this event) ----
export function useEventClients(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'clients'],
    queryFn: async () => (await api.get<string[]>(`/api/events/${eventId}/clients`)).data,
  })
}

export function useSetEventClients(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (clientUserIds: string[]) =>
      (await api.put<string[]>(`/api/events/${eventId}/clients`, { clientUserIds })).data,
    onSuccess: (data) => qc.setQueryData(['events', eventId, 'clients'], data),
  })
}

export function useDeleteEvent(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/api/events/${eventId}`)
    },
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['events', eventId] })
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}
