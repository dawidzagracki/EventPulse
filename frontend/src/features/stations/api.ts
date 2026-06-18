import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { StationDto, StationInput, StationStatDto } from '../../types/api'

export function useStations(eventId: string) {
  return useQuery({
    queryKey: ['stations', eventId],
    queryFn: async () => (await api.get<StationDto[]>(`/api/events/${eventId}/stations`)).data,
  })
}

export function useStationsSummary(eventId: string) {
  return useQuery({
    queryKey: ['stations', eventId, 'summary'],
    queryFn: async () => (await api.get<StationStatDto[]>(`/api/events/${eventId}/stations/summary`)).data,
  })
}

export function useSaveStations(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (stations: StationInput[]) =>
      (await api.put<StationDto[]>(`/api/events/${eventId}/stations`, { stations })).data,
    onSuccess: (data) => {
      qc.setQueryData(['stations', eventId], data)
      qc.invalidateQueries({ queryKey: ['stations', eventId, 'summary'] })
    },
  })
}
