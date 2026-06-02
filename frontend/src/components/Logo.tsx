import type { ImgHTMLAttributes } from 'react'

/**
 * App logo. The actual image lives in /public/logo.png so Vite serves it at /logo.png.
 * `size` controls the rendered height; width auto-scales so any aspect ratio works
 * (icon-only square or icon+wordmark rectangle).
 */
export function Logo({
  size = 36,
  className = '',
  alt = 'EventPulse',
  style,
  ...rest
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> & { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      className={`block object-contain ${className}`}
      style={{ height: size, width: 'auto', ...style }}
      {...rest}
    />
  )
}
