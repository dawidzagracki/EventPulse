import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface EmojiPickerProps {
  value: string
  onChange: (next: string) => void
}

/** Curated set covering the common event-agenda / label icons. */
const EMOJIS = [
  '🏷', '🎤', '🍽', '🍷', '🍺', '☕', '🎉', '🎊', '🎁', '🎵', '🎬', '📸',
  '🚌', '🚐', '✈️', '🏨', '🛏', '🗺', '📍', '🤝', '💬', '👥', '🧑‍💻', '💼',
  '📅', '⏰', '⭐', '🔥', '💡', '🏆', '🎯', '🎓', '🧘', '🏃', '⚽', '🎮',
]

/**
 * Emoji / icon picker used for agenda types. A small button shows the current
 * icon; clicking opens a portal popover with a grid plus a free-text field so
 * any emoji or short label can still be entered. Portal + fixed positioning
 * keeps it from being clipped by panel overflow, and works across browsers.
 */
export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect()
      if (r) setPos({ top: r.bottom + 6, left: r.left })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return
      if (popRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-900/60 text-lg transition hover:border-indigo-400/60"
        aria-label="Wybierz ikonę"
        aria-expanded={open}
      >
        {value || '🏷'}
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 60 }}
            className="w-64 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl shadow-black/50"
          >
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    onChange(e)
                    setOpen(false)
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-lg transition hover:bg-slate-800 ${
                    e === value ? 'ring-1 ring-inset ring-indigo-400/60' : ''
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              maxLength={4}
              spellCheck={false}
              placeholder="Własny emoji / znak"
              className="mt-3 w-full rounded-md border border-slate-700/70 bg-slate-950/60 px-2 py-1.5 text-center text-sm text-white outline-none focus:border-indigo-400/60"
            />
          </div>,
          document.body,
        )}
    </>
  )
}
