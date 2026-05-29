import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { BrandingDto, PageContentDoc, PageDto, PageVersionDto } from '../../types/api'

const pageKey = (eventId: string) => ['page', eventId]

export function usePage(eventId: string) {
  return useQuery({
    queryKey: pageKey(eventId),
    queryFn: async () => (await api.get<PageDto>(`/api/events/${eventId}/page`)).data,
  })
}

export function useSaveDraft(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (content: PageContentDoc) =>
      (await api.put<PageDto>(`/api/events/${eventId}/page`, content)).data,
    onSuccess: (data) => qc.setQueryData(pageKey(eventId), data),
  })
}

export function useApplyTemplate(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (key: string) =>
      (await api.post<PageDto>(`/api/events/${eventId}/page/template/${key}`)).data,
    onSuccess: (data) => qc.setQueryData(pageKey(eventId), data),
  })
}

export function useUpdateBranding(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (branding: BrandingDto) =>
      (await api.put<PageDto>(`/api/events/${eventId}/page/branding`, branding)).data,
    onSuccess: (data) => qc.setQueryData(pageKey(eventId), data),
  })
}

export function usePublish(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.post<PageDto>(`/api/events/${eventId}/page/publish`)).data,
    onSuccess: (data) => {
      qc.setQueryData(pageKey(eventId), data)
      qc.invalidateQueries({ queryKey: ['page-versions', eventId] })
    },
  })
}

export function useVersions(eventId: string) {
  return useQuery({
    queryKey: ['page-versions', eventId],
    queryFn: async () => (await api.get<PageVersionDto[]>(`/api/events/${eventId}/page/versions`)).data,
  })
}

export function useRestoreVersion(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (version: number) =>
      (await api.post<PageDto>(`/api/events/${eventId}/page/versions/${version}/restore`)).data,
    onSuccess: (data) => qc.setQueryData(pageKey(eventId), data),
  })
}
