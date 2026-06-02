/**
 * Block schema — describes what each block type supports.
 *
 * `contentFields` are language-scoped strings stored under `block.content[lang]`.
 * `settingsRepeaters` describe array-shaped settings (FAQ items, team members, etc.)
 *   stored under `block.settings[key]`.
 * `settingsFields` are scalar settings (e.g. spacer height).
 *
 * `styleOptions` toggles which Style-tab controls show up.
 */

export type FieldKind = 'text' | 'longtext' | 'url' | 'image'

export interface ContentField {
  key: string
  label: string
  kind: FieldKind
  placeholder?: string
}

export interface RepeaterItemField {
  key: string
  label: string
  kind: FieldKind
}

export interface RepeaterDef {
  /** Settings key under which the array lives. */
  key: string
  /** Label of the section. */
  label: string
  /** Fields making up one item. */
  itemFields: RepeaterItemField[]
  /** Label of the "Add" button. */
  addLabel: string
  /** Empty hint shown when no items yet. */
  emptyHint: string
}

export interface ScalarSettingField {
  key: string
  label: string
  kind: 'number' | 'text'
  min?: number
  max?: number
  step?: number
}

export interface BlockSchema {
  type: string
  titlePl: string
  titleEn: string
  /** Lucide-like emoji icon (kept simple). */
  icon: string
  /** Per-language text fields. */
  contentFields: ContentField[]
  /** Repeating arrays (FAQ items, team members, sponsors logos). */
  settingsRepeaters?: RepeaterDef[]
  /** Scalar settings (spacer height, etc.). */
  settingsFields?: ScalarSettingField[]
  /** Which Style-tab controls are relevant. */
  styleOptions: {
    background?: boolean
    padding?: boolean
    textAlign?: boolean
    borderRadius?: boolean
    titleColor?: boolean
    textColor?: boolean
    accentOverride?: boolean
  }
}

export const BLOCK_SCHEMAS: Record<string, BlockSchema> = {
  hero: {
    type: 'hero',
    titlePl: 'Sekcja powitalna',
    titleEn: 'Hero',
    icon: '✨',
    contentFields: [
      { key: 'subtitle', label: 'Nadtytuł', kind: 'text', placeholder: 'NADTYTUŁ' },
      { key: 'title', label: 'Tytuł', kind: 'text', placeholder: 'Tytuł wydarzenia' },
      { key: 'dateLabel', label: 'Data (tekst)', kind: 'text', placeholder: 'Data' },
      { key: 'location', label: 'Miejsce', kind: 'text', placeholder: 'Miejsce' },
      { key: 'ctaLabel', label: 'Etykieta przycisku', kind: 'text', placeholder: 'Zarejestruj się' },
      { key: 'ctaUrl', label: 'Link przycisku', kind: 'url' },
      { key: 'bgImageUrl', label: 'URL obrazu w tle', kind: 'image' },
    ],
    styleOptions: { background: true, padding: true, textAlign: true, borderRadius: true, accentOverride: true },
  },
  description: {
    type: 'description',
    titlePl: 'Opis',
    titleEn: 'Description',
    icon: '📄',
    contentFields: [
      { key: 'title', label: 'Tytuł sekcji', kind: 'text' },
      { key: 'body', label: 'Treść', kind: 'longtext', placeholder: 'Opisz tu swoje wydarzenie...' },
    ],
    styleOptions: { background: true, padding: true, textAlign: true, borderRadius: true, titleColor: true, textColor: true },
  },
  agenda: {
    type: 'agenda',
    titlePl: 'Agenda',
    titleEn: 'Agenda',
    icon: '📅',
    contentFields: [{ key: 'title', label: 'Tytuł sekcji', kind: 'text', placeholder: 'Agenda' }],
    styleOptions: { background: true, padding: true, borderRadius: true, titleColor: true, accentOverride: true },
  },
  map: {
    type: 'map',
    titlePl: 'Mapa',
    titleEn: 'Map',
    icon: '📍',
    contentFields: [
      { key: 'title', label: 'Tytuł sekcji', kind: 'text', placeholder: 'Lokalizacja' },
      { key: 'address', label: 'Adres (Google Maps)', kind: 'text' },
    ],
    styleOptions: { background: true, padding: true, borderRadius: true, titleColor: true },
  },
  gallery: {
    type: 'gallery',
    titlePl: 'Galeria',
    titleEn: 'Gallery',
    icon: '🖼️',
    contentFields: [{ key: 'title', label: 'Tytuł sekcji', kind: 'text', placeholder: 'Galeria' }],
    styleOptions: { background: true, padding: true, borderRadius: true, titleColor: true },
  },
  sponsors: {
    type: 'sponsors',
    titlePl: 'Partnerzy',
    titleEn: 'Sponsors',
    icon: '🤝',
    contentFields: [{ key: 'title', label: 'Tytuł sekcji', kind: 'text', placeholder: 'Partnerzy' }],
    settingsRepeaters: [
      {
        key: 'logos',
        label: 'Partnerzy',
        addLabel: 'Dodaj partnera',
        emptyHint: 'Brak partnerów — dodaj pierwszego.',
        itemFields: [
          { key: 'name', label: 'Nazwa', kind: 'text' },
          { key: 'logoUrl', label: 'URL logo', kind: 'image' },
          { key: 'url', label: 'Link', kind: 'url' },
        ],
      },
    ],
    styleOptions: { background: true, padding: true, borderRadius: true, titleColor: true },
  },
  countdown: {
    type: 'countdown',
    titlePl: 'Odliczanie',
    titleEn: 'Countdown',
    icon: '⏱️',
    contentFields: [{ key: 'title', label: 'Tytuł', kind: 'text', placeholder: 'Do startu zostało' }],
    styleOptions: { background: true, padding: true, borderRadius: true, accentOverride: true },
  },
  faq: {
    type: 'faq',
    titlePl: 'FAQ',
    titleEn: 'FAQ',
    icon: '❓',
    contentFields: [{ key: 'title', label: 'Tytuł sekcji', kind: 'text', placeholder: 'Najczęstsze pytania' }],
    settingsRepeaters: [
      {
        key: 'items',
        label: 'Pytania i odpowiedzi',
        addLabel: 'Dodaj pytanie',
        emptyHint: 'Brak pytań — dodaj pierwsze.',
        itemFields: [
          { key: 'q', label: 'Pytanie', kind: 'text' },
          { key: 'a', label: 'Odpowiedź', kind: 'longtext' },
        ],
      },
    ],
    styleOptions: { background: true, padding: true, borderRadius: true, titleColor: true, textColor: true },
  },
  team: {
    type: 'team',
    titlePl: 'Zespół',
    titleEn: 'Team',
    icon: '👥',
    contentFields: [{ key: 'title', label: 'Tytuł sekcji', kind: 'text', placeholder: 'Zespół' }],
    settingsRepeaters: [
      {
        key: 'members',
        label: 'Członkowie zespołu',
        addLabel: 'Dodaj osobę',
        emptyHint: 'Brak osób — dodaj pierwszą.',
        itemFields: [
          { key: 'name', label: 'Imię i nazwisko', kind: 'text' },
          { key: 'role', label: 'Rola', kind: 'text' },
          { key: 'avatarUrl', label: 'URL zdjęcia', kind: 'image' },
        ],
      },
    ],
    styleOptions: { background: true, padding: true, borderRadius: true, titleColor: true },
  },
  video: {
    type: 'video',
    titlePl: 'Wideo',
    titleEn: 'Video',
    icon: '▶️',
    contentFields: [
      { key: 'title', label: 'Tytuł sekcji', kind: 'text', placeholder: 'Wideo' },
      { key: 'youtubeUrl', label: 'Link YouTube', kind: 'url' },
    ],
    styleOptions: { background: true, padding: true, borderRadius: true, titleColor: true },
  },
  cta: {
    type: 'cta',
    titlePl: 'Wezwanie do akcji',
    titleEn: 'Call to action',
    icon: '🎯',
    contentFields: [
      { key: 'title', label: 'Tytuł', kind: 'text', placeholder: 'Dołącz do nas' },
      { key: 'body', label: 'Treść', kind: 'longtext', placeholder: 'Krótki tekst zachęcający' },
      { key: 'buttonLabel', label: 'Etykieta przycisku', kind: 'text' },
      { key: 'buttonUrl', label: 'Link przycisku', kind: 'url' },
    ],
    styleOptions: { background: true, padding: true, textAlign: true, borderRadius: true, accentOverride: true },
  },
  spacer: {
    type: 'spacer',
    titlePl: 'Odstęp',
    titleEn: 'Spacer',
    icon: '↕️',
    contentFields: [],
    settingsFields: [{ key: 'height', label: 'Wysokość odstępu (px)', kind: 'number', min: 4, max: 400, step: 4 }],
    styleOptions: {},
  },
}

export const ALL_BLOCK_TYPES = Object.keys(BLOCK_SCHEMAS)

export function blockSchema(type: string): BlockSchema | undefined {
  return BLOCK_SCHEMAS[type]
}

export function blockLabel(type: string, lang: 'pl' | 'en'): string {
  const s = BLOCK_SCHEMAS[type]
  if (!s) return type
  return lang === 'en' ? s.titleEn : s.titlePl
}

export function blockIcon(type: string): string {
  return BLOCK_SCHEMAS[type]?.icon ?? '◻'
}
