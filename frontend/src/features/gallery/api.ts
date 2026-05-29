import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

export interface Photo {
  id: string
  fileName: string
  contentType: string
  published: boolean
  uploadedAt: string
}

export function useGallery(eventId: string) {
  return useQuery({
    queryKey: ['gallery', eventId],
    queryFn: async () => (await api.get<Photo[]>(`/api/events/${eventId}/gallery`)).data,
  })
}

export function useUploadPhoto(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      await api.post(`/api/events/${eventId}/gallery`, form)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gallery', eventId] }),
  })
}

export function useDeletePhoto(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/events/${eventId}/gallery/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gallery', eventId] }),
  })
}

export function useMyGallery() {
  return useQuery({
    queryKey: ['me', 'gallery'],
    queryFn: async () => (await api.get<Photo[]>('/api/me/gallery')).data,
  })
}

/** Fetches an authenticated image and returns an object URL (img src can't send the bearer token). */
export async function fetchPhotoUrl(path: string): Promise<string> {
  const res = await api.get(path, { responseType: 'blob' })
  return URL.createObjectURL(res.data as Blob)
}
