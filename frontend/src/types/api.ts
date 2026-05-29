export interface AuthResult {
  accessToken: string
  refreshToken: string
  accessExpiresAt: string
  principalType: 'Agency' | 'Client' | 'Participant'
  tenantId: string
  displayName: string
  role: string | null
}

export const EventStatus = {
  Draft: 0,
  Published: 1,
  Live: 2,
  Completed: 3,
  Archived: 4,
} as const

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus]

export const EventStatusName: Record<number, string> = {
  0: 'Draft',
  1: 'Published',
  2: 'Live',
  3: 'Completed',
  4: 'Archived',
}

export interface EventDto {
  id: string
  name: string
  slug: string
  status: EventStatus
  startsAt: string
  endsAt: string
  location: string | null
  description: string | null
  defaultLanguage: string
  clientEmail: string | null
  createdAt: string
  updatedAt: string | null
}

export interface CreateEventRequest {
  name: string
  startsAt: string
  endsAt: string
  location?: string | null
  description?: string | null
  defaultLanguage?: string | null
  clientEmail?: string | null
}
