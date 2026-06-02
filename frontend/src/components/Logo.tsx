import { useId, useState, type CSSProperties } from 'react'

interface LogoProps {
  /** Rendered height in pixels (width auto-scales). */
  size?: number
  className?: string
  style?: CSSProperties
  /** Show only the icon (square), without the "EventPulse" wordmark. */
  iconOnly?: boolean
  alt?: string
}

/**
 * App logo. Renders a built-in SVG by default so the app works out of the box.
 * If a `logo.png` file exists in `frontend/public/`, it is preferred — drop the
 * official asset there and the SVG fallback steps aside automatically.
 */
export function Logo({ size = 36, className = '', style, iconOnly = true, alt = 'EventPulse' }: LogoProps) {
  const [pngFailed, setPngFailed] = useState(false)
  const reactId = useId()
  const iconId = `lg-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  if (!pngFailed) {
    return (
      <img
        src="/logo.png"
        alt={alt}
        onError={() => setPngFailed(true)}
        className={`block object-contain ${className}`}
        style={{ height: size, width: 'auto', ...style }}
      />
    )
  }

  // SVG fallback — gradient square with location pin + pulse line, optionally
  // followed by the "EventPulse" wordmark to mirror the official lockup.
  const iconBox = (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden role="img" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={iconId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="60%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="14" fill={`url(#${iconId})`} />
      {/* Location pin */}
      <path
        d="M32 14c-6.6 0-12 5.2-12 11.6 0 8.3 12 22.4 12 22.4s12-14.1 12-22.4C44 19.2 38.6 14 32 14zm0 16.2a4.6 4.6 0 110-9.2 4.6 4.6 0 010 9.2z"
        fill="#fff"
        opacity="0.95"
      />
      {/* Pulse line */}
      <path
        d="M10 52 H22 L26 44 L32 58 L38 46 L42 52 H54"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.9"
      />
    </svg>
  )

  if (iconOnly) {
    return (
      <span className={className} style={style} aria-label={alt} role="img">
        {iconBox}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      style={style}
      aria-label={alt}
      role="img"
    >
      {iconBox}
      <span
        className="font-bold leading-none text-white"
        style={{ fontSize: size * 0.55, letterSpacing: '-0.01em' }}
      >
        EventPulse
      </span>
    </span>
  )
}
