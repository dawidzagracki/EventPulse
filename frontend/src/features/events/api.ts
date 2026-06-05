import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { CreateEventRequest, EventDto } from '../../types/api'

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
