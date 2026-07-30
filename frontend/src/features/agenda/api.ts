import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { AgendaItemDto, AgendaItemInput, AgendaTypeDto, AgendaTypeInput } from '../../types/api'

/** Result of the on-demand "notify guests" send — mirrors SendInvitationsResult. */
export interface NotifyAgendaResult {
  sentCount: number
  failedCount: number
}

/**
 * Mails every guest the current agenda. Agenda edits send nothing on their own, so this is the only
 * way a change reaches guests — one deliberate wave instead of one per edited item.
 */
export function useNotifyAgenda(eventId: string) {
  return useMutation({
    mutationFn: async () =>
      (await api.post<NotifyAgendaResult>(`/api/events/${eventId}/agenda/notify`)).data,
  })
}

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

export function useUpdateAgendaItem(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: AgendaItemInput }) =>
      (await api.put<AgendaItemDto>(`/api/events/${eventId}/agenda/${id}`, input)).data,
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

// ---- Custom agenda types (admin-defined per event) ----
export function useAgendaTypes(eventId: string) {
  return useQuery({
    queryKey: ['agenda', eventId, 'types'],
    queryFn: async () => (await api.get<AgendaTypeDto[]>(`/api/events/${eventId}/agenda/types`)).data,
  })
}

export function useSaveAgendaTypes(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (types: AgendaTypeInput[]) =>
      (await api.put<AgendaTypeDto[]>(`/api/events/${eventId}/agenda/types`, { types })).data,
    onSuccess: (data) => {
      qc.setQueryData(['agenda', eventId, 'types'], data)
      qc.invalidateQueries({ queryKey: ['agenda', eventId] })
    },
  })
}
