export interface AuthResult {
  accessToken: string
  refreshToken: string
  accessExpiresAt: string
  principalType: 'Agency' | 'Client' | 'Participant'
  tenantId: string
  displayName: string
  role: string | null
}

export interface ParticipantLoginResult {
  accessToken: string
  accessExpiresAt: string
  participantId: string
  eventId: string
  firstName: string
  lastName: string
  language: string
}

export interface MyProfileDto {
  id: string
  eventId: string
  firstName: string
  lastName: string
  email: string
  language: string
  status: number
  hasAcceptedRodo: boolean
  photoConsent: boolean
  networkingConsent: boolean
  dietaryPreferences: string | null
  shirtSize: string | null
  wishes: string | null
  airportTransfer: boolean
  arrivalTime: string | null
  flightNumber: string | null
  tableName: string | null
  roomNumber: string | null
  groupName: string | null
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

export const ParticipantStatusName: Record<number, string> = {
  0: 'Invited',
  1: 'Activated',
  2: 'Confirmed',
  3: 'Declined',
  4: 'CheckedIn',
  5: 'CheckedOut',
  6: 'NoShow',
}

export interface ParticipantDto {
  id: string
  eventId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  company: string | null
  position: string | null
  language: string
  groupName: string | null
  tableName: string | null
  roomNumber: string | null
  airportTransfer: boolean
  dietaryPreferences: string | null
  status: number
}

export interface ImportResult {
  totalRows: number
  validRows: number
  importedCount: number
  errors: { rowNumber: number; message: string }[]
  duplicateEmails: string[]
  committed: boolean
}

export interface SendInvitationsResult {
  sentCount: number
  failedCount: number
}

export const AgendaItemTypeName: Record<number, string> = {
  0: 'Talk',
  1: 'Meal',
  2: 'Attraction',
  3: 'Transport',
  4: 'Networking',
  5: 'Other',
}

export interface AgendaItemDto {
  id: string
  eventId: string
  startsAt: string
  endsAt: string
  titlePl: string
  titleEn: string
  descriptionPl: string | null
  descriptionEn: string | null
  type: number
  locationName: string | null
  locationMapUrl: string | null
  speakerName: string | null
  speakerPhone: string | null
  speakerPhotoUrl: string | null
  menu: string | null
  requiresCheckIn: boolean
  dressCode: string | null
  groupName: string | null
}

export interface AgendaItemInput {
  startsAt: string
  endsAt: string
  titlePl: string
  titleEn: string
  descriptionPl?: string | null
  descriptionEn?: string | null
  type: number
  locationName?: string | null
  locationMapUrl?: string | null
  speakerName?: string | null
  speakerPhone?: string | null
  speakerPhotoUrl?: string | null
  menu?: string | null
  requiresCheckIn: boolean
  dressCode?: string | null
  groupName?: string | null
}

export interface PageBlock {
  id: string
  type: string
  order: number
  visible: boolean
  settings: Record<string, unknown>
  content: { pl: Record<string, string>; en: Record<string, string> }
  styles: Record<string, unknown>
}

export interface PageContentDoc {
  blocks: PageBlock[]
}

export interface BrandingDto {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  logoUrl: string | null
  faviconUrl: string | null
  backgroundColor: string | null
}

export interface SeoDto {
  title: string | null
  description: string | null
  ogImageUrl: string | null
}

export interface PageDto {
  eventId: string
  content: PageContentDoc
  branding: BrandingDto
  seo: SeoDto
  publishedVersion: number
  hasPublished: boolean
}

export interface PageVersionDto {
  version: number
  publishedAt: string
}

export const ScanKind = { CheckIn: 0, CheckOut: 1, Station: 2 } as const
export type ScanKind = (typeof ScanKind)[keyof typeof ScanKind]

export interface RecentCheckIn {
  name: string
  at: string
}

export interface DashboardData {
  total: number
  invited: number
  confirmed: number
  checkedIn: number
  checkedOut: number
  noShow: number
  attendancePct: number
  recentCheckIns: RecentCheckIn[]
}

export interface BatchScanResult {
  accepted: number
  duplicates: number
  notFound: number
  items: { clientId: string; status: string }[]
}
