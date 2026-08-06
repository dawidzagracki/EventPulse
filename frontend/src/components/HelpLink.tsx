/**
 * The question mark that sits next to a screen's title and opens the handbook on the page that
 * explains that exact screen.
 *
 * Opens in a new tab deliberately: someone reaching for help is in the middle of something, and
 * navigating away from a half-filled form to read about it is how people lose work.
 */
export function HelpLink({ article, label }: { article: string; label?: string }) {
  const title = label ?? 'Jak to działa?'

  return (
    <a
      href={`/docs/${article}`}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={title}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-600/70 text-[11px] font-bold leading-none text-slate-400 transition hover:border-indigo-400 hover:bg-indigo-500/15 hover:text-indigo-200"
    >
      ?
    </a>
  )
}
