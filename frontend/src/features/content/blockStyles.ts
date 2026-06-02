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
  if (bgType === 'color' && typeof s.bgColor === 'string') {
    style.background = s.bgColor
  } else if (bgType === 'gradient' && typeof s.bgGradientFrom === 'string' && typeof s.bgGradientTo === 'string') {
    const angle = typeof s.bgGradientAngle === 'number' ? s.bgGradientAngle : 135
    style.background = `linear-gradient(${angle}deg, ${s.bgGradientFrom}, ${s.bgGradientTo})`
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
