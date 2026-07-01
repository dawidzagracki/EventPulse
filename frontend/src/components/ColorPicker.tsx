import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ColorPickerProps {
  value: string
  onChange: (next: string) => void
  /** Hide the editable hex input next to the swatch (for tight rows). */
  compact?: boolean
  /** Extra swatches shown first, e.g. the current brand palette. */
  swatches?: string[]
}

/** A spread of preset swatches. Works everywhere — no reliance on the native
 *  `<input type=color>` popup, which Safari refuses to open programmatically. */
const PRESETS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#1d4ed8', '#0f172a', '#334155', '#64748b', '#94a3b8', '#e2e8f0', '#ffffff',
]

/** Normalize free-form input to a `#rrggbb` string, or null when invalid. */
function normalizeHex(raw: string): string | null {
  const v = raw.trim().toLowerCase()
  let c = v.startsWith('#') ? v : `#${v}`
  if (/^#[0-9a-f]{3}$/.test(c)) {
    c = '#' + c.slice(1).split('').map((x) => x + x).join('')
  }
  return /^#[0-9a-f]{6}$/.test(c) ? c : null
}

/**
 * Cross-browser colour picker. The swatch opens a popover (rendered in a portal
 * so panel `overflow` never clips it) with preset swatches, a hex field, and a
 * native colour input as a bonus. The universal path (swatches + hex) means it
 * works identically on Chrome, Safari/iOS and Firefox.
 */
export function ColorPicker({ value, onChange, compact = false, swatches }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  // Local text lets the user type freely; commit on blur/Enter. Re-sync when the
  // parent value changes, using the standard "previous value" render idiom.
  const [text, setText] = useState(value)
  const [lastSeen, setLastSeen] = useState(value)
  if (value !== lastSeen) {
    setLastSeen(value)
    setText(value)
  }

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

  function commitText(raw: string) {
    const c = normalizeHex(raw)
    if (c) onChange(c)
    else setText(value) // revert an invalid entry
  }

  const nativeValue = normalizeHex(value) ?? '#000000'
  const all = [...(swatches ?? []), ...PRESETS].filter((c, i, a) => a.indexOf(c) === i)

  return (
    <div className="flex items-stretch gap-2 rounded-lg border border-slate-700/60 bg-slate-950/40 p-1.5">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative h-9 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-slate-700/60 transition hover:ring-indigo-400/60"
        style={{ background: value }}
        aria-label="Wybierz kolor"
        aria-expanded={open}
      >
        <span className="sr-only">Wybierz kolor</span>
      </button>
      {!compact && (
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => commitText(text)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          spellCheck={false}
          className="w-24 flex-1 rounded-md bg-transparent px-2 font-mono text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-inset focus:ring-indigo-400/40"
          placeholder="#hex"
        />
      )}
      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 60 }}
            className="w-56 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl shadow-black/50"
          >
            <div className="grid grid-cols-8 gap-1.5">
              {all.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => {
                    onChange(c)
                    setOpen(false)
                  }}
                  className={`h-6 w-6 rounded-md ring-1 ring-inset transition hover:scale-110 ${
                    c.toLowerCase() === value.toLowerCase() ? 'ring-2 ring-white' : 'ring-slate-700/60'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              {/* A real, user-clicked colour input (opacity-0 over the swatch) —
                  this pattern DOES open the native picker on Safari. */}
              <label
                className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md ring-1 ring-inset ring-slate-700/60"
                style={{ background: value }}
                title="Dowolny kolor"
              >
                <input
                  type="color"
                  value={nativeValue}
                  onChange={(e) => onChange(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={() => commitText(text)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitText((e.target as HTMLInputElement).value)
                }}
                spellCheck={false}
                placeholder="#hex"
                className="w-full rounded-md border border-slate-700/70 bg-slate-950/60 px-2 py-1.5 font-mono text-sm text-white outline-none focus:border-indigo-400/60"
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
