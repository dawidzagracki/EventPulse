import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { TransferDto } from '../../types/api'

const key = (eventId: string) => ['transfers', eventId]

export function useTransfers(eventId: string) {
  return useQuery({
    queryKey: key(eventId),
    queryFn: async () => (await api.get<TransferDto[]>(`/api/events/${eventId}/transfers`)).data,
  })
}

export function useCreateTransfer(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; departureTime: string; meetingPoint: string; note: string | null }) =>
      (await api.post<TransferDto>(`/api/events/${eventId}/transfers`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: key(eventId) }),
  })
}

export function useDeleteTransfer(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/events/${eventId}/transfers/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(eventId) }),
  })
}
