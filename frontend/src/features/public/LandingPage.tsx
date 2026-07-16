import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Logo } from '../../components/Logo'
import { Icon } from '../../components/Icon'

/**
 * Public marketing/info page served at "/". Anonymous visitors (and URL scanners)
 * previously landed straight on a bare login form — a classic phishing-page pattern
 * that got the young domain flagged as "Suspicious" by e-mail link filters (Sophos
 * Time-of-Click). A real homepage with product info, contact and a privacy policy
 * gives reputation classifiers legitimate content to score.
 */
export function LandingPage() {
  const principalType = useAuthStore((s) => s.principalType)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Logged-in staff keep their old "eventpulse.pl → panel" habit.
  if (isAuthenticated() && (principalType === 'Agency' || principalType === 'Client')) {
    return <Navigate to="/events" replace />
  }
  if (isAuthenticated() && principalType === 'Participant') {
    return <Navigate to="/me" replace />
  }

  const features = [
    {
      icon: 'mail' as const,
      title: 'Zaproszenia i potwierdzenia',
      text: 'Personalizowane zaproszenia e-mail z indywidualnym linkiem dla każdego gościa, potwierdzenia obecności (RSVP) i przypomnienia.',
    },
    {
      icon: 'document' as const,
      title: 'Strony wydarzeń',
      text: 'Kreator publicznych stron wydarzeń: agenda, lokalizacja, licznik czasu, galeria i formularz rejestracji — bez pisania kodu.',
    },
    {
      icon: 'qr' as const,
      title: 'Check-in kodem QR',
      text: 'Każdy gość otrzymuje osobisty kod QR. Recepcja skanuje go telefonem — wejścia i wyjścia zapisują się w czasie rzeczywistym.',
    },
    {
      icon: 'dashboard' as const,
      title: 'Dashboard na żywo',
      text: 'Frekwencja, statusy gości i aktywność stanowisk na jednym ekranie, odświeżane na bieżąco w trakcie wydarzenia.',
    },
    {
      icon: 'image' as const,
      title: 'Galeria zdjęć zgodna z RODO',
      text: 'Zdjęcia z wydarzenia publikowane wyłącznie za zgodą uczestników, z pełną kontrolą organizatora nad widocznością.',
    },
    {
      icon: 'sparkles' as const,
      title: 'Aktywności i quizy',
      text: 'Quizy na żywo, konkursy i networking dla uczestników — prosto z telefonu, bez instalowania aplikacji.',
    },
  ]

  const steps = [
    {
      no: '01',
      title: 'Organizator tworzy wydarzenie',
      text: 'Agencja konfiguruje wydarzenie: listę gości, agendę, stronę informacyjną i wygląd komunikacji e-mail.',
    },
    {
      no: '02',
      title: 'Goście otrzymują zaproszenia',
      text: 'Każdy zaproszony dostaje e-mail z osobistym linkiem do swojej strony wydarzenia — agendą, kodem QR i szczegółami.',
    },
    {
      no: '03',
      title: 'Wydarzenie pod kontrolą',
      text: 'W dniu wydarzenia recepcja skanuje kody QR, a organizator śledzi frekwencję na dashboardzie w czasie rzeczywistym.',
    },
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-200">
      {/* ───────────── Layered backdrop (house style) ───────────── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-1/4 -top-40 h-[42rem] w-[42rem] rounded-full blur-3xl opacity-50"
          style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.4), transparent 70%)' }}
        />
        <div
          className="absolute -right-40 top-1/4 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-45"
          style={{ background: 'radial-gradient(closest-side, rgba(217,70,239,0.32), transparent 70%)' }}
        />
        <div className="absolute -bottom-40 left-1/3 h-[30rem] w-[30rem] rounded-full bg-violet-600/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(rgb(148 163 184) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* ───────────── Top nav ───────────── */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="bg-gradient-to-r from-indigo-200 via-violet-200 to-fuchsia-200 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
            Event<span className="font-light italic">Pulse</span>
          </span>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <a
            href="#funkcje"
            className="hidden rounded-lg px-3 py-2 text-slate-300 transition hover:bg-slate-800/60 hover:text-white sm:block"
          >
            Funkcje
          </a>
          <a
            href="#kontakt"
            className="hidden rounded-lg px-3 py-2 text-slate-300 transition hover:bg-slate-800/60 hover:text-white sm:block"
          >
            Kontakt
          </a>
          <Link
            to="/login"
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:opacity-90"
          >
            Zaloguj się
          </Link>
        </nav>
      </header>

      {/* ───────────── Hero ───────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-14 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200 backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
          </span>
          Platforma do zarządzania wydarzeniami
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
          Wydarzenia firmowe{' '}
          <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
            od zaproszenia po raport
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-slate-300/95 sm:text-lg">
          EventPulse to narzędzie dla agencji eventowych i ich klientów: zaproszenia e-mail,
          rejestracja gości, strony wydarzeń, check-in kodami QR i frekwencja na żywo — wszystko
          w jednym miejscu, zgodnie z RODO.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/login"
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:opacity-90"
          >
            Panel organizatora
          </Link>
          <a
            href="#jak-to-dziala"
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 backdrop-blur transition hover:border-indigo-400/40 hover:bg-slate-900"
          >
            Jak to działa?
          </a>
        </div>
      </section>

      {/* ───────────── Features ───────────── */}
      <section id="funkcje" className="mx-auto w-full max-w-6xl scroll-mt-8 px-6 pb-20">
        <h2 className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Wszystko, czego potrzebuje Twoje wydarzenie
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5 backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-slate-900/70"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full bg-indigo-500/0 blur-2xl transition group-hover:bg-indigo-500/20"
              />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-indigo-200 ring-1 ring-inset ring-indigo-400/30">
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <h3 className="relative mt-4 text-base font-semibold text-white">{f.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── How it works ───────────── */}
      <section id="jak-to-dziala" className="mx-auto w-full max-w-6xl scroll-mt-8 px-6 pb-20">
        <h2 className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">Jak to działa</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.no}
              className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6 backdrop-blur"
            >
              <span className="bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text font-mono text-3xl font-extrabold text-transparent">
                {s.no}
              </span>
              <h3 className="mt-3 text-base font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── For whom / trust ───────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40 p-8 backdrop-blur sm:p-10">
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/10" aria-hidden />
          <div className="relative grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Dla kogo jest EventPulse?</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Platforma powstała z myślą o <strong className="text-white">agencjach eventowych</strong> obsługujących
                konferencje, gale, premiery produktów i wydarzenia integracyjne. Klient agencji otrzymuje własny
                panel do podglądu swojego wydarzenia, a goście — wygodną stronę mobilną z agendą i osobistym kodem QR.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Dostęp do panelu przyznaje agencja obsługująca wydarzenie. Jeśli jesteś gościem — skorzystaj
                z linku otrzymanego w zaproszeniu e-mail.
              </p>
            </div>
            <div className="grid content-start gap-3">
              {[
                { icon: 'shield' as const, text: 'Dane uczestników przetwarzane zgodnie z RODO, z opcją automatycznej anonimizacji po wydarzeniu.' },
                { icon: 'bolt' as const, text: 'Infrastruktura w Unii Europejskiej (OVH, Francja), szyfrowane połączenia HTTPS.' },
                { icon: 'users' as const, text: 'Osobne role dla agencji, klienta, recepcji i uczestników — każdy widzi tylko to, co powinien.' },
              ].map((i) => (
                <div key={i.text} className="flex items-start gap-3 rounded-xl border border-slate-800/70 bg-slate-950/40 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-indigo-200 ring-1 ring-inset ring-indigo-400/30">
                    <Icon name={i.icon} className="h-4 w-4" />
                  </span>
                  <p className="text-sm leading-relaxed text-slate-300">{i.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Contact + footer ───────────── */}
      <footer id="kontakt" className="border-t border-slate-800/70 bg-slate-950/60">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <Logo size={28} />
              <span className="bg-gradient-to-r from-indigo-200 via-violet-200 to-fuchsia-200 bg-clip-text text-base font-extrabold tracking-tight text-transparent">
                Event<span className="font-light italic">Pulse</span>
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Platforma do kompleksowej obsługi wydarzeń firmowych — od zaproszeń, przez rejestrację
              i check-in, po raporty frekwencji.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Kontakt</h3>
            <p className="mt-3 text-sm text-slate-400">
              Pytania dotyczące platformy lub danych osobowych:
            </p>
            <a href="mailto:admin@eventpulse.pl" className="mt-1 inline-block text-sm font-medium text-indigo-300 hover:text-indigo-200">
              admin@eventpulse.pl
            </a>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Informacje</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-slate-400 transition hover:text-white">
                  Polityka prywatności (RODO)
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-400 transition hover:text-white">
                  Logowanie dla organizatorów
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800/70 py-5 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} EventPulse · Wszystkie prawa zastrzeżone
        </div>
      </footer>
    </div>
  )
}
