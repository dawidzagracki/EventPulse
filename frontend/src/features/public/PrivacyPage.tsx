import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'

/** Static RODO/GDPR privacy policy — linked from the landing page footer. */
export function PrivacyPage() {
  const sections: { title: string; body: React.ReactNode }[] = [
    {
      title: '1. Administrator danych',
      body: (
        <p>
          Administratorem danych osobowych przetwarzanych w serwisie EventPulse (eventpulse.pl) jest operator
          platformy. W sprawach dotyczących danych osobowych można się kontaktować pod adresem{' '}
          <a href="mailto:admin@eventpulse.pl" className="text-indigo-300 hover:text-indigo-200">admin@eventpulse.pl</a>.
          W przypadku danych uczestników konkretnego wydarzenia administratorem danych jest organizator tego
          wydarzenia (agencja lub jej klient), a operator platformy działa jako podmiot przetwarzający.
        </p>
      ),
    },
    {
      title: '2. Jakie dane przetwarzamy',
      body: (
        <ul className="list-disc space-y-1 pl-5">
          <li>dane uczestników wydarzeń: imię i nazwisko, adres e-mail, opcjonalnie numer telefonu, firma, preferencje (np. dieta) oraz odpowiedzi w formularzach rejestracyjnych,</li>
          <li>dane kont organizatorów: adres e-mail, nazwa wyświetlana, rola w systemie,</li>
          <li>dane o obecności: zeskanowane wejścia/wyjścia (check-in/check-out) w trakcie wydarzenia,</li>
          <li>zdjęcia z wydarzeń — wyłącznie po wyrażeniu odrębnej, dobrowolnej zgody uczestnika,</li>
          <li>techniczne logi serwera (adres IP, czas żądania) niezbędne do zapewnienia bezpieczeństwa usługi.</li>
        </ul>
      ),
    },
    {
      title: '3. Cele i podstawy prawne',
      body: (
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-slate-200">organizacja wydarzenia</strong> (zaproszenia, rejestracja, check-in, komunikacja) — prawnie uzasadniony interes organizatora lub zgoda uczestnika (art. 6 ust. 1 lit. b, f RODO),</li>
          <li><strong className="text-slate-200">publikacja zdjęć</strong> — wyłącznie zgoda uczestnika (art. 6 ust. 1 lit. a RODO), którą można w każdej chwili wycofać,</li>
          <li><strong className="text-slate-200">bezpieczeństwo i niezawodność usługi</strong> — prawnie uzasadniony interes administratora (art. 6 ust. 1 lit. f RODO).</li>
        </ul>
      ),
    },
    {
      title: '4. Odbiorcy danych',
      body: (
        <p>
          Dane przetwarzane są na serwerach w Unii Europejskiej (OVH, Francja). Do wysyłki wiadomości e-mail
          korzystamy z usługi Brevo (Sendinblue SAS, Francja). Dane nie są sprzedawane ani udostępniane podmiotom
          trzecim w celach marketingowych.
        </p>
      ),
    },
    {
      title: '5. Okres przechowywania',
      body: (
        <p>
          Dane uczestników przechowywane są przez czas niezbędny do obsługi wydarzenia. Organizator może włączyć
          automatyczną anonimizację danych uczestników po zakończeniu wydarzenia — dane osobowe są wtedy trwale
          zastępowane wartościami anonimowymi po upływie skonfigurowanej liczby dni.
        </p>
      ),
    },
    {
      title: '6. Prawa osób, których dane dotyczą',
      body: (
        <p>
          Każdej osobie przysługuje prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia
          przetwarzania, przenoszenia oraz sprzeciwu, a także prawo wycofania zgody w dowolnym momencie
          i wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych. Żądania można kierować na adres{' '}
          <a href="mailto:admin@eventpulse.pl" className="text-indigo-300 hover:text-indigo-200">admin@eventpulse.pl</a>{' '}
          lub bezpośrednio do organizatora wydarzenia.
        </p>
      ),
    },
    {
      title: '7. Pliki cookie i pamięć lokalna',
      body: (
        <p>
          Serwis nie używa plików cookie do śledzenia ani profilowania i nie zawiera zewnętrznych narzędzi
          analitycznych czy reklamowych. Do utrzymania sesji zalogowanego użytkownika wykorzystywana jest pamięć
          lokalna przeglądarki (localStorage), niezbędna do działania usługi.
        </p>
      ),
    },
    {
      title: '8. Zmiany polityki',
      body: (
        <p>
          Polityka może być aktualizowana wraz z rozwojem platformy. Aktualna wersja jest zawsze dostępna pod
          adresem eventpulse.pl/privacy.
        </p>
      ),
    },
  ]

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-300">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full blur-3xl opacity-40"
          style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.35), transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(rgb(148 163 184) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-3">
          <Logo size={32} />
          <span className="bg-gradient-to-r from-indigo-200 via-violet-200 to-fuchsia-200 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
            Event<span className="font-light italic">Pulse</span>
          </span>
        </Link>
        <Link to="/" className="text-sm text-slate-400 transition hover:text-white">
          ← Strona główna
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 pb-20">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Polityka prywatności</h1>
        <p className="mt-2 text-sm text-slate-500">Ostatnia aktualizacja: lipiec 2026</p>

        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-white">{s.title}</h2>
              <div className="mt-2 text-sm leading-relaxed">{s.body}</div>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-800/70 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} EventPulse
      </footer>
    </div>
  )
}
