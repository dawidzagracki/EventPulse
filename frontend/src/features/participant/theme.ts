import { useMyBranding, useMyEvent } from './api'

/**
 * Full brand theme for the participant app, derived from the event page's brand colours.
 * Active only when the organiser enables "Kolory marki w aplikacji gościa" — then the WHOLE
 * app repaints: background wash, hero/card gradients, primary buttons, active states.
 */
export interface BrandTheme {
  accent: string
  accentSoft: string
  /** Whole-app background: dark base washed with the brand hue. */
  appBg: string
  /** Hero / highlighted-card gradient. */
  heroBg: string
  /** Primary button background. */
  btnBg: string
  /** Subtle tinted border for cards/tiles. */
  border: string
  /** Header / bottom-nav bar background: dark base tinted with the brand hue (semi-opaque for blur). */
  barBg: string
}

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

const rgba = (rgb: [number, number, number], a: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`

/** Mix a colour toward black to get a deeper shade (keeps the hue, works on any input). */
function shade(rgb: [number, number, number], factor: number): [number, number, number] {
  return [Math.round(rgb[0] * factor), Math.round(rgb[1] * factor), Math.round(rgb[2] * factor)]
}

export function buildBrandTheme(primary?: string | null, accent?: string | null): BrandTheme | null {
  const p = primary ? hexToRgb(primary) : null
  if (!p) return null
  const a = (accent ? hexToRgb(accent) : null) ?? p
  const deep = shade(p, 0.55)
  // Blend the brand hue into the near-black app base (#020617) for the nav/header bars.
  const base: [number, number, number] = [2, 6, 23]
  const bar: [number, number, number] = [
    Math.round(base[0] * 0.72 + p[0] * 0.28),
    Math.round(base[1] * 0.72 + p[1] * 0.28),
    Math.round(base[2] * 0.72 + p[2] * 0.28),
  ]
  return {
    accent: rgba(p, 1),
    accentSoft: rgba(p, 0.16),
    appBg:
      `radial-gradient(900px 500px at 85% -10%, ${rgba(p, 0.22)}, transparent 60%),` +
      `radial-gradient(700px 450px at -10% 25%, ${rgba(a, 0.14)}, transparent 55%),` +
      `linear-gradient(180deg, ${rgba(deep, 0.28)}, rgba(2,6,23,0) 340px), #020617`,
    heroBg: `linear-gradient(135deg, ${rgba(p, 0.34)}, ${rgba(a, 0.16)} 55%, transparent)`,
    btnBg: `linear-gradient(135deg, ${rgba(p, 1)}, ${rgba(shade(p, 0.8), 1)})`,
    border: rgba(p, 0.35),
    barBg: rgba(bar, 0.9),
  }
}

/**
 * The active brand theme for the current participant, or null when the organiser
 * hasn't enabled brand colours (default indigo look applies). Query results are
 * cached by React Query, so calling this in many components is free.
 */
export function useBrandTheme(): BrandTheme | null {
  const { data: ev } = useMyEvent()
  const { data: branding } = useMyBranding()
  if (!ev?.appUseBrandColors) return null
  return buildBrandTheme(branding?.primaryColor, branding?.accentColor)
}
