import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

export interface AdminDto {
  id: string
  email: string
  displayName: string
  role: string
  isActive: boolean
  createdAt: string
}

export interface ClientDto {
  id: string
  email: string
  displayName: string
  isActive: boolean
  isActivated: boolean
  createdAt: string
}

export interface CreateAdminRequest {
  email: string
  displayName: string
  password: string
  role: 'Admin' | 'EventStaff'
}

export interface CreateClientRequest {
  email: string
  displayName: string
  password: string
}

export function useAdmins() {
  return useQuery({
    queryKey: ['team', 'admins'],
    queryFn: async () => (await api.get<AdminDto[]>('/api/team/admins')).data,
  })
}

export function useClients() {
  return useQuery({
    queryKey: ['team', 'clients'],
    queryFn: async () => (await api.get<ClientDto[]>('/api/team/clients')).data,
  })
}

export function useCreateAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateAdminRequest) => (await api.post<AdminDto>('/api/team/admins', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', 'admins'] }),
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateClientRequest) => (await api.post<ClientDto>('/api/team/clients', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', 'clients'] }),
  })
}

export interface OperatorLinkResult {
  accessToken: string
  expiresAt: string
  eventId: string
  eventName: string
}

// Operators have no account — the super admin mints a short-lived, event-scoped
// link that drops them straight onto the scanner.
export async function generateOperatorLink(eventId: string): Promise<OperatorLinkResult> {
  return (await api.post<OperatorLinkResult>(`/api/events/${eventId}/operator-link`)).data
}
