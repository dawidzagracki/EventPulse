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

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
