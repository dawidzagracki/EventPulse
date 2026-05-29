import { useTranslation } from 'react-i18next'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? 'pl'

  return (
    <div className="flex gap-1 text-xs">
      {(['pl', 'en'] as const).map((lng) => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
          className={`rounded px-2 py-1 uppercase ${
            current === lng ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {lng}
        </button>
      ))}
    </div>
  )
}
