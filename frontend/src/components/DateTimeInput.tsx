import { Input } from './ui'

/**
 * Cross-browser date+time field.
 *
 * `<input type="datetime-local">` has no picker on desktop Safari (it degrades to
 * a plain text box that demands the exact `YYYY-MM-DDTHH:mm` format). Where the
 * native control is missing we fall back to a `type="date"` + `type="time"` pair
 * — both are supported everywhere, including Safari/iOS. The emitted value keeps
 * the same `YYYY-MM-DDTHH:mm` shape the rest of the app already uses.
 */
const SUPPORTS_DATETIME_LOCAL = (() => {
  if (typeof document === 'undefined') return true
  const el = document.createElement('input')
  el.setAttribute('type', 'datetime-local')
  const bogus = 'not-a-date'
  el.value = bogus
  // A browser that understands the type sanitizes the bogus value away.
  return el.value !== bogus
})()

interface Props {
  value: string
  onChange: (next: string) => void
  required?: boolean
  autoFocus?: boolean
  className?: string
}

export function DateTimeInput({ value, onChange, required, autoFocus, className }: Props) {
  if (SUPPORTS_DATETIME_LOCAL) {
    return (
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        className={className}
      />
    )
  }

  const date = value.slice(0, 10)
  const time = value.slice(11, 16)
  const combine = (d: string, tm: string) => (d ? `${d}T${tm || '00:00'}` : '')

  return (
    <div className="flex gap-2">
      <Input
        type="date"
        value={date}
        onChange={(e) => onChange(combine(e.target.value, time))}
        required={required}
        autoFocus={autoFocus}
      />
      <Input
        type="time"
        value={time}
        onChange={(e) => onChange(combine(date, e.target.value))}
        required={required}
        className="w-28"
      />
    </div>
  )
}
