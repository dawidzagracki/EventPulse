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
  email: string | null
  phone: string | null
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
  hotelName: string | null
  hotelAddress: string | null
  hotelPhone: string | null
  customFields: Record<string, string>
  onboardingCompleted: boolean
}

export interface TransferDto {
  id: string
  eventId: string
  name: string
  departureTime: string
  meetingPoint: string
  note: string | null
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

export const CustomFieldType = {
  Text: 0,
  Textarea: 1,
  Checkbox: 2,
  Select: 3,
  MultiSelect: 4,
} as const
export type CustomFieldType = (typeof CustomFieldType)[keyof typeof CustomFieldType]

/** MultiSelect selection rule for one option: exclusive (can't combine) or restricted to `allowedWith`. */
export interface OptionRuleDto {
  exclusive: boolean
  allowedWith: string[]
}

export interface CustomFieldDto {
  id: string
  labelPl: string
  labelEn: string | null
  type: number
  options: string[]
  optionRules: Record<string, OptionRuleDto>
  required: boolean
  order: number
}

export interface CustomFieldInput {
  id: string | null
  labelPl: string
  labelEn: string | null
  type: number
  options: string[] | null
  required: boolean
  optionRules?: Record<string, OptionRuleDto> | null
}

export interface OnboardingStepDto {
  id: string
  titlePl: string
  titleEn: string | null
  bodyPl: string | null
  bodyEn: string | null
  requireConfirm: boolean
  order: number
}

export interface OnboardingStepInput {
  titlePl: string
  titleEn: string | null
  bodyPl: string | null
  bodyEn: string | null
  requireConfirm: boolean
}

export interface EventSettingsDto {
  usesLocationData: boolean
  phoneRequired: boolean
  allowCompanions: boolean
  maxCompanions: number
  anonymizeEnabled: boolean
  anonymizeAfterDays: number
  anonymizedAt: string | null
  customPhotosUrl: string | null
  customPhotosText: string | null
  showAgendaTab: boolean
  showActivitiesTab: boolean
  showGalleryTab: boolean
  showPreferencesTile: boolean
  showShirtSize: boolean
  allowSelfRegistration: boolean
  companyName: string | null
  showPhotoConsent: boolean
  appUseBrandColors: boolean
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
  settings: EventSettingsDto
  emailBranding: EmailBrandingDto
}

export interface EmailBrandingDto {
  accentColor: string | null
  logoUrl: string | null
  headerName: string | null
  fromName: string | null
  subject: string | null
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
  email: string | null
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
  parentParticipantId: string | null
  age: number | null
  accessToken: string
  hasAcceptedRodo: boolean
  photoConsent: boolean
  networkingConsent: boolean
  shirtSize: string | null
  wishes: string | null
  customFields: Record<string, string>
}

export interface CompanionDto {
  id: string
  firstName: string
  lastName: string
  age: number | null
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
  customTypeId: string | null
  customTypeName: string | null
  customTypeNameEn: string | null
  customTypeColor: string | null
  customTypeIcon: string | null
}

export interface AgendaTypeDto {
  id: string
  namePl: string
  nameEn: string | null
  color: string
  icon: string | null
  order: number
}

export interface AgendaTypeInput {
  id: string | null
  namePl: string
  nameEn: string | null
  color: string
  icon: string | null
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
  customTypeId?: string | null
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
  /** Hides the event name beside the logo in the public nav (logo-only header). */
  hideNameInNav: boolean
}

export interface BrandingSuggestionDto {
  primaryColor: string | null
  secondaryColor: string | null
  accentColor: string | null
  logoUrl: string | null
  faviconUrl: string | null
  ogImageUrl: string | null
  title: string | null
  description: string | null
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
  /** Published exists but the saved draft differs — there are changes not yet live. */
  hasUnpublishedChanges: boolean
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

export interface StationActivity {
  code: string
  count: number
  people: number
}

export interface StationDto {
  id: string
  name: string
  nameEn: string | null
  icon: string | null
  scanLimitPerParticipant: number
  countsAsCheckIn: boolean
  allowSelfScan: boolean
  active: boolean
  order: number
}

export interface StationInput {
  id: string | null
  name: string
  nameEn: string | null
  icon: string | null
  scanLimitPerParticipant: number
  countsAsCheckIn: boolean
  allowSelfScan: boolean
  active: boolean
}

export interface StationStatDto {
  id: string | null
  name: string
  icon: string | null
  scanLimitPerParticipant: number
  countsAsCheckIn: boolean
  allowSelfScan: boolean
  active: boolean
  scans: number
  people: number
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
  stations: StationActivity[]
}

export interface ScanResultItem {
  clientId: string
  status: 'accepted' | 'duplicate' | 'notfound' | string
  name?: string | null
  participantStatus?: number | null
  tableName?: string | null
  roomNumber?: string | null
  dietary?: string | null
  alreadyCheckedIn?: boolean
  previousAt?: string | null
}

export interface BatchScanResult {
  accepted: number
  duplicates: number
  notFound: number
  items: ScanResultItem[]
}

export interface ContestDto {
  id: string
  eventId: string
  name: string
  mode: number
}

export interface QuizDto {
  id: string
  eventId: string
  title: string
}

export interface RankingEntry {
  rank: number
  name: string
  score: number
}

export interface QuizQuestionDto {
  id: string
  text: string
  options: string[]
}

export interface QuizTakeDto {
  quizId: string
  title: string
  questions: QuizQuestionDto[]
}

export interface ContactDto {
  name: string
  email: string | null
}
