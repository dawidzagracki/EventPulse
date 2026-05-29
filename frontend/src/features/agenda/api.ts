import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { AgendaItemDto, AgendaItemInput } from '../../types/api'

export function useAgenda(eventId: string) {
  return useQuery({
    queryKey: ['agenda', eventId],
    queryFn: async () => (await api.get<AgendaItemDto[]>(`/api/events/${eventId}/agenda`)).data,
  })
}

export function useCreateAgendaItem(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AgendaItemInput) =>
      (await api.post<AgendaItemDto>(`/api/events/${eventId}/agenda`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda', eventId] }),
  })
}

export function useDeleteAgendaItem(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/events/${eventId}/agenda/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda', eventId] }),
  })
}
