const BLOCK_META: Record<string, { titlePl: string; titleEn: string; icon: string }> = {
  hero: { titlePl: 'Sekcja powitalna', titleEn: 'Hero', icon: '✨' },
  description: { titlePl: 'Opis', titleEn: 'Description', icon: '📄' },
  agenda: { titlePl: 'Agenda', titleEn: 'Agenda', icon: '📅' },
  map: { titlePl: 'Mapa', titleEn: 'Map', icon: '📍' },
  gallery: { titlePl: 'Galeria', titleEn: 'Gallery', icon: '🖼️' },
  sponsors: { titlePl: 'Partnerzy', titleEn: 'Sponsors', icon: '🤝' },
  countdown: { titlePl: 'Odliczanie', titleEn: 'Countdown', icon: '⏱️' },
  faq: { titlePl: 'FAQ', titleEn: 'FAQ', icon: '❓' },
  team: { titlePl: 'Zespół', titleEn: 'Team', icon: '👥' },
  video: { titlePl: 'Wideo', titleEn: 'Video', icon: '▶️' },
  cta: { titlePl: 'Wezwanie do akcji', titleEn: 'Call to action', icon: '🎯' },
  spacer: { titlePl: 'Odstęp', titleEn: 'Spacer', icon: '↕️' },
}

export const ALL_BLOCK_TYPES = Object.keys(BLOCK_META)

export function blockLabel(type: string, lang: 'pl' | 'en') {
  const meta = BLOCK_META[type]
  if (!meta) return type
  return lang === 'en' ? meta.titleEn : meta.titlePl
}

export function blockIcon(type: string) {
  return BLOCK_META[type]?.icon ?? '◻'
}
