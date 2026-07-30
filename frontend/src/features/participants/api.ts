import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { ImportResult, ParticipantDto, SendInvitationsResult } from '../../types/api'

export function useParticipants(eventId: string) {
  return useQuery({
    queryKey: ['participants', eventId],
    queryFn: async () => (await api.get<ParticipantDto[]>(`/api/events/${eventId}/participants`)).data,
  })
}

export function useImportParticipants(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, commit }: { file: File; commit: boolean }) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post<ImportResult>(
        `/api/events/${eventId}/participants/import?commit=${commit}`,
        form,
      )
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['participants', eventId] }),
  })
}

export function useAddParticipant(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    // Adding a guest sends nothing — invitations and QR codes go out only from an explicit action.
    mutationFn: async (body: {
      firstName: string
      lastName: string
      email: string
      entryOnly?: boolean
    }) => (await api.post<ParticipantDto>(`/api/events/${eventId}/participants`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['participants', eventId] }),
  })
}

/** Skipped = asked for but not written to (companion, no address, declined). */
export interface SendCustomMessageResult {
  sentCount: number
  failedCount: number
  skippedCount: number
}

/** Mails the given guests a message the organiser wrote themselves. */
export function useSendCustomMessage(eventId: string) {
  return useMutation({
    mutationFn: async (body: {
      participantIds: string[]
      subjectPl: string
      bodyPl: string
      subjectEn?: string | null
      bodyEn?: string | null
    }) => (await api.post<SendCustomMessageResult>(`/api/events/${eventId}/participants/message`, body)).data,
  })
}

/** Sends ONE guest their invitation pair: the app link plus, separately, their QR code. */
export function useSendInvitationToOne(eventId: string) {
  return useMutation({
    mutationFn: async (participantId: string) =>
      (await api.post<SendInvitationsResult>(`/api/events/${eventId}/participants/${participantId}/invitation`)).data,
  })
}

/** Re-sends a guest their entry QR code — the fix when someone loses the mail on the event day. */
export function useSendEntryQr(eventId: string) {
  return useMutation({
    mutationFn: async (participantId: string) => {
      await api.post(`/api/events/${eventId}/participants/${participantId}/qr-email`)
    },
  })
}

export function useDeleteParticipant(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (participantId: string) => {
      await api.delete(`/api/events/${eventId}/participants/${participantId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['participants', eventId] }),
  })
}

export function useSendInvitations(eventId: string) {
  return useMutation({
    mutationFn: async () =>
      (await api.post<SendInvitationsResult>(`/api/events/${eventId}/participants/invitations?onlyNotInvited=false`))
        .data,
  })
}

export function useSendClientLinks(eventId: string) {
  return useMutation({
    mutationFn: async () =>
      (await api.post<{ linkCount: number }>(`/api/events/${eventId}/participants/client-links`)).data,
  })
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadTemplate(eventId: string) {
  const res = await api.get(`/api/events/${eventId}/participants/template`, { responseType: 'blob' })
  saveBlob(res.data as Blob, 'eventpulse-uczestnicy-szablon.xlsx')
}

export async function openParticipantQr(eventId: string, participantId: string) {
  const res = await api.get(`/api/events/${eventId}/participants/${participantId}/qr`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  window.open(url, '_blank')
}

export async function exportParticipants(eventId: string) {
  const res = await api.get(`/api/events/${eventId}/participants/export`, { responseType: 'blob' })
  saveBlob(res.data as Blob, 'eventpulse-uczestnicy.xlsx')
}
