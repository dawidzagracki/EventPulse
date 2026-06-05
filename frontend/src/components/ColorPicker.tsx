import { useRef, useState } from 'react'

interface ColorPickerProps {
  value: string
  onChange: (next: string) => void
  /** Hide the editable hex input next to the swatch. */
  compact?: boolean
}

/**
 * Color picker that actually SHOWS the current color:
 * - Large left swatch (renders the current value, click opens native picker)
 * - Right side: hex text input the user can paste into
 * The native <input type="color"> is hidden behind the swatch so the browser's
 * default "narrow text-strip" rendering never leaks through.
 */
export function ColorPicker({ value, onChange, compact = false }: ColorPickerProps) {
  const ref = useRef<HTMLInputElement>(null)
  // Local text state lets the user type freely; we only commit on blur/Enter.
  // Re-sync to props by keying off the `value` prop change: when the parent's
  // value changes we update text in render via the standard "prevProps" idiom.
  const [text, setText] = useState(value)
  const [lastSeen, setLastSeen] = useState(value)
  if (value !== lastSeen) {
    setLastSeen(value)
    setText(value)
  }

  function commitText(raw: string) {
    const v = raw.trim()
    // Allow #abc / #aabbcc / no-hash / shorthand
    let candidate = v.startsWith('#') ? v : `#${v}`
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(candidate)) {
      // Expand #abc → #aabbcc so the native picker accepts it.
      if (candidate.length === 4) {
        candidate = '#' + candidate.slice(1).split('').map((c) => c + c).join('')
      }
      onChange(candidate.toLowerCase())
    }
  }

  return (
    <div className="flex items-stretch gap-2 rounded-lg border border-slate-700/60 bg-slate-950/40 p-1.5">
      {/* Swatch — fills the left side. Clicking triggers the hidden native picker. */}
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="relative h-9 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-slate-700/60 transition hover:ring-indigo-400/60"
        style={{ background: value }}
        aria-label="Wybierz kolor"
      >
        <span className="sr-only">Wybierz kolor</span>
      </button>
      {/* Hidden native color input (positioned offscreen but functional). */}
      <input
        ref={ref}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-hidden
      />
      {!compact && (
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => commitText(text)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          spellCheck={false}
          className="w-24 flex-1 rounded-md bg-transparent px-2 font-mono text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-inset focus:ring-indigo-400/40"
          placeholder="#hex"
        />
      )}
    </div>
  )
}
