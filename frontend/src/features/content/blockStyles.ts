import type { PageBlock } from '../../types/api'

/**
 * Reads `block.styles` and returns inline CSS + extra classes that the block
 * renderer applies to its root <section>.
 */
export function getBlockStyle(block: PageBlock): {
  style: React.CSSProperties
  className: string
  titleColor?: string
  textColor?: string
  accentColor?: string
} {
  const s = (block.styles ?? {}) as Record<string, unknown>
  const style: React.CSSProperties = {}

  const bgType = (s.bgType as string) ?? 'default'
  const bgColor = typeof s.bgColor === 'string' ? s.bgColor : undefined
  const gFrom = typeof s.bgGradientFrom === 'string' ? s.bgGradientFrom : undefined
  const gTo = typeof s.bgGradientTo === 'string' ? s.bgGradientTo : undefined
  if (bgType === 'color' && bgColor) {
    style.background = bgColor
  } else if (bgType === 'gradient') {
    // Tolerate partially-set gradients: the Style tab shows default "from"/"to"
    // colours but only persists the one the user actually changes, so a block can
    // end up with just "to" (or a leftover bgColor). Fall back from→to→bgColor so
    // the chosen colour still renders instead of nothing (which showed as white).
    // When NONE are set, leave background unset so the block keeps its own default
    // (e.g. countdown's brand gradient).
    const from = gFrom ?? bgColor ?? gTo
    const to = gTo ?? bgColor ?? gFrom
    if (from || to) {
      const angle = typeof s.bgGradientAngle === 'number' ? s.bgGradientAngle : 135
      style.background = `linear-gradient(${angle}deg, ${from ?? to}, ${to ?? from})`
    }
  }

  if (typeof s.padding === 'number') style.padding = s.padding
  if (typeof s.borderRadius === 'number') style.borderRadius = s.borderRadius
  if (typeof s.textAlign === 'string') style.textAlign = s.textAlign as React.CSSProperties['textAlign']

  let className = ''
  const anim = s.animation as string | undefined
  if (anim && anim !== 'none') className += ` block-anim block-anim-${anim}`
  if (typeof s.customClass === 'string' && s.customClass.trim()) className += ' ' + s.customClass.trim()

  return {
    style,
    className: className.trim(),
    titleColor: typeof s.titleColor === 'string' ? s.titleColor : undefined,
    textColor: typeof s.textColor === 'string' ? s.textColor : undefined,
    accentColor: typeof s.accentColor === 'string' ? s.accentColor : undefined,
  }
}
