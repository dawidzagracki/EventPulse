import { useTranslation } from 'react-i18next'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? 'pl'

  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-700/60 bg-slate-900/60 text-[11px]">
      {(['pl', 'en'] as const).map((lng) => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
          className={`px-2 py-1 uppercase tracking-wide transition ${
            current === lng ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-pressed={current === lng}
        >
          {lng}
        </button>
      ))}
    </div>
  )
}
