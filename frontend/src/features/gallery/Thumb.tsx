import { useEffect, useState } from 'react'
import { fetchPhotoUrl } from './api'

/** Loads an authenticated image as a blob object URL and renders it. */
export function Thumb({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoke: string | null = null
    let active = true
    fetchPhotoUrl(path).then((u) => {
      if (active) {
        revoke = u
        setUrl(u)
      } else {
        URL.revokeObjectURL(u)
      }
    })
    return () => {
      active = false
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [path])

  return (
    <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
      {url && <img src={url} alt={alt} className="h-full w-full object-cover" />}
    </div>
  )
}
