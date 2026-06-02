import type { ImgHTMLAttributes } from 'react'

/**
 * App logo. The actual image lives in /public/logo.png so Vite serves it at /logo.png.
 * Use the `size` prop to set both width and height; pass `className` for extra styling.
 */
export function Logo({
  size = 36,
  className = '',
  alt = 'EventPulse',
  ...rest
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> & { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`rounded-xl object-cover ${className}`}
      {...rest}
    />
  )
}
