import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ARTICLES, DOC_GROUPS, findArticle, type DocArticle, type DocBlock } from './content'
import { Icon } from '../../components/Icon'
import { Logo } from '../../components/Logo'

/**
 * The handbook. Public on purpose: someone who cannot log in — a client waiting for their account,
 * a hostess an hour before the doors open — is exactly who needs to read it most.
 *
 * Three columns like every documentation people already know: what there is on the left, the article
 * in the middle, where you are inside it on the right.
 */
export function DocsPage() {
  const { slug } = useParams()
  const [query, setQuery] = useState('')

  const article = findArticle(slug) ?? ARTICLES[0]

  // Search runs over titles, summaries and the body text, so typing "autokar" finds the agenda
  // article even though the word appears only in an example.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length < 2) {
      return ARTICLES
    }
    return ARTICLES.filter((a) => haystack(a).includes(needle))
  }, [query])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="text-sm font-bold text-white">
              EventPulse <span className="font-medium text-indigo-300">Pomoc</span>
            </span>
          </Link>

          <div className="relative ml-auto w-full max-w-sm">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj w pomocy…"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/70 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none"
            />
          </div>

          <Link
            to="/"
            className="hidden shrink-0 rounded-xl border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-indigo-400/50 hover:text-white sm:block"
          >
            Wróć do aplikacji
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
        <Sidebar articles={matches} active={article.slug} />

        <main className="min-w-0 flex-1 pb-24">
          <Article article={article} />
        </main>

        <Toc article={article} />
      </div>
    </div>
  )
}

function haystack(a: DocArticle): string {
  const blocks = a.sections.flatMap((s) => [s.title, ...s.blocks.flatMap(blockText)])
  return [a.title, a.summary, ...blocks].join(' ').toLowerCase()
}

function blockText(block: DocBlock): string[] {
  switch (block.kind) {
    case 'text':
    case 'tip':
    case 'warn':
      return [block.text]
    case 'steps':
    case 'list':
      return block.items
    case 'faq':
      return block.items.flatMap((i) => [i.q, i.a])
  }
}

function Sidebar({ articles, active }: { articles: DocArticle[]; active: string }) {
  return (
    <nav className="sticky top-20 hidden h-fit w-56 shrink-0 lg:block">
      {articles.length === 0 && (
        <p className="text-sm text-slate-500">Nic nie znaleziono. Spróbuj innego słowa.</p>
      )}

      {DOC_GROUPS.map((group) => {
        const inGroup = articles.filter((a) => a.group === group)
        if (inGroup.length === 0) {
          return null
        }

        return (
          <div key={group} className="mb-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group}</p>
            <ul className="space-y-0.5">
              {inGroup.map((a) => (
                <li key={a.slug}>
                  <Link
                    to={`/docs/${a.slug}`}
                    className={`block rounded-lg px-2.5 py-1.5 text-sm transition ${
                      a.slug === active
                        ? 'bg-indigo-500/15 font-semibold text-indigo-200'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

function Toc({ article }: { article: DocArticle }) {
  return (
    <aside className="sticky top-20 hidden h-fit w-52 shrink-0 xl:block">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Na tej stronie</p>
      <ul className="space-y-2 border-l border-slate-800 pl-3">
        {article.sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-xs text-slate-400 hover:text-indigo-300">
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function Article({ article }: { article: DocArticle }) {
  return (
    <article>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">
        <Icon name={article.icon} className="h-4 w-4" />
        {article.group}
      </div>

      <h1 className="text-4xl font-bold tracking-tight text-white">{article.title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">{article.summary}</p>

      {article.sections.map((section) => (
        <section key={section.id} id={section.id} className="mt-10 scroll-mt-24">
          <h2 className="text-xl font-semibold text-white">{section.title}</h2>
          <div className="mt-4 space-y-4">
            {section.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </section>
      ))}

      <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <p className="text-sm font-semibold text-white">Nie znalazłeś odpowiedzi?</p>
        <p className="mt-1 text-sm text-slate-400">
          Napisz do nas — dopiszemy brakujący opis, żeby następnym razem był tu, gdzie go szukałeś.
        </p>
      </div>
    </article>
  )
}

function Block({ block }: { block: DocBlock }) {
  switch (block.kind) {
    case 'text':
      return <p className="max-w-2xl leading-relaxed text-slate-300">{block.text}</p>

    case 'steps':
      // Numbered, because the order matters — that is the whole difference from a plain list.
      return (
        <ol className="max-w-2xl space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-bold text-indigo-300">
                {i + 1}
              </span>
              <span className="leading-relaxed text-slate-300">{item}</span>
            </li>
          ))}
        </ol>
      )

    case 'list':
      return (
        <ul className="max-w-2xl space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              <span className="leading-relaxed text-slate-300">{item}</span>
            </li>
          ))}
        </ul>
      )

    case 'tip':
      return (
        <div className="max-w-2xl rounded-xl border-l-2 border-emerald-400 bg-emerald-400/5 py-3 pl-4 pr-4">
          <p className="text-sm font-semibold text-emerald-300">Dobra rada</p>
          <p className="mt-1 leading-relaxed text-slate-300">{block.text}</p>
        </div>
      )

    case 'warn':
      return (
        <div className="max-w-2xl rounded-xl border-l-2 border-amber-400 bg-amber-400/5 py-3 pl-4 pr-4">
          <p className="text-sm font-semibold text-amber-300">Zwróć uwagę</p>
          <p className="mt-1 leading-relaxed text-slate-300">{block.text}</p>
        </div>
      )

    case 'faq':
      return (
        <div className="max-w-2xl divide-y divide-slate-800 rounded-xl border border-slate-800">
          {block.items.map((item, i) => (
            <details key={i} className="group px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-200">
                {item.q}
                <span className="text-slate-500 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 leading-relaxed text-slate-400">{item.a}</p>
            </details>
          ))}
        </div>
      )
  }
}
