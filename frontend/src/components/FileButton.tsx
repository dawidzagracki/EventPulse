import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

interface FileButtonProps {
  accept?: string
  multiple?: boolean
  /** Called with the selected File list. Input is auto-cleared afterwards. */
  onSelect: (files: File[]) => void | Promise<void>
  /** Button label. */
  children: ReactNode
  /** Optional icon (defaults to "document"). */
  icon?: IconName
  /** Style variant — gradient primary CTA or quiet outline. */
  variant?: 'primary' | 'subtle'
  /** Disable interaction (e.g. while an upload is in progress). */
  disabled?: boolean
  /** Show name of the most recently picked file next to the button. */
  showFileName?: boolean
  className?: string
}

/**
 * Styled wrapper around a hidden <input type="file"> so the trigger looks
 * like a proper Button, not a piece of platform-default UI.
 */
export function FileButton({
  accept,
  multiple = false,
  onSelect,
  children,
  icon = 'document',
  variant = 'primary',
  disabled = false,
  showFileName = false,
  className = '',
}: FileButtonProps) {
  const ref = useRef<HTMLInputElement>(null)
  const [pickedName, setPickedName] = useState<string | null>(null)
  const [pickedCount, setPickedCount] = useState(0)

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) {
      setPickedName(files[0]?.name ?? null)
      setPickedCount(files.length)
      await onSelect(files)
    }
    if (ref.current) ref.current.value = ''
  }

  const base =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-violet-500/30 hover:opacity-95'
      : 'border border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white'

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <label className={`${base} ${styles} ${disabled ? '' : 'cursor-pointer'}`}>
        <Icon name={icon} className="h-3.5 w-3.5" />
        <span>{children}</span>
        <input
          ref={ref}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
      </label>
      {showFileName && pickedName && (
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/60 bg-slate-950/60 px-2 py-1 text-xs text-slate-300">
          <Icon name="check" className="h-3 w-3 text-emerald-400" />
          <span className="max-w-[180px] truncate">{pickedName}</span>
          {pickedCount > 1 && <span className="text-slate-500">+{pickedCount - 1}</span>}
        </span>
      )}
    </div>
  )
}
