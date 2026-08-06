import type { IconName } from '../../components/Icon'

/**
 * The handbook, written for the person running the event — not for a developer. Every article
 * answers "how do I do this and what happens next", never "how is this implemented".
 *
 * Kept in Polish only, on purpose: the readers are the agency and its Polish clients. Guests never
 * see these pages, so the pl/en parity rule the guest-facing UI follows does not apply here, and a
 * half-translated handbook would be worse than one good language.
 */

export type DocBlock =
  | { kind: 'text'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'tip'; text: string }
  | { kind: 'warn'; text: string }
  | { kind: 'faq'; items: { q: string; a: string }[] }

export interface DocSection {
  id: string
  title: string
  blocks: DocBlock[]
}

export interface DocArticle {
  slug: string
  title: string
  summary: string
  icon: IconName
  group: string
  sections: DocSection[]
}

export const DOC_GROUPS = ['Na start', 'Prowadzenie wydarzenia', 'W dniu wydarzenia', 'Wygląd i treść', 'Ustawienia'] as const

export const ARTICLES: DocArticle[] = [
  {
    slug: 'start',
    title: 'Od czego zacząć',
    summary: 'Czym jest EventPulse, kto z niego korzysta i jak wygląda praca krok po kroku.',
    icon: 'sparkles',
    group: 'Na start',
    sections: [
      {
        id: 'czym-jest',
        title: 'Czym jest EventPulse',
        blocks: [
          {
            kind: 'text',
            text: 'EventPulse prowadzi wydarzenie od pierwszego zaproszenia do raportu po wszystkim. '
              + 'W jednym miejscu trzymasz listę gości, program dnia, stronę wydarzenia i maile, a w dniu '
              + 'imprezy sprawdzasz kody QR przy wejściu i widzisz na żywo, kto już dotarł.',
          },
          {
            kind: 'text',
            text: 'Nie musisz nic instalować ani niczego konfigurować. Wszystko dzieje się w przeglądarce, '
              + 'a goście dostają zwykłe maile i stronę, którą otwierają na telefonie.',
          },
        ],
      },
      {
        id: 'kto-korzysta',
        title: 'Kto z czego korzysta',
        blocks: [
          {
            kind: 'list',
            items: [
              'Agencja — widzi wszystko i wszystko może zmieniać. To Twoje konto.',
              'Klient — widzi swoje wydarzenie: listę gości, program, stronę i wyniki. Nie zmienia ustawień technicznych.',
              'Obsługa przy wejściu — dostaje jeden link do skanera. Nie zakłada konta i nie widzi reszty aplikacji.',
              'Gość — dostaje maila z linkiem i kodem QR. Otwiera swoją stronę na telefonie.',
            ],
          },
        ],
      },
      {
        id: 'sciezka',
        title: 'Typowa ścieżka wydarzenia',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Tworzysz wydarzenie: nazwa, termin, miejsce.',
              'Wgrywasz listę gości z Excela albo dodajesz ich pojedynczo.',
              'Układasz program dnia w zakładce Agenda.',
              'Ustawiasz wygląd strony wydarzenia i maili — kolory, logo, nazwę nadawcy.',
              'Wysyłasz zaproszenia. Każdy gość dostaje dwa maile: link do aplikacji i osobno kod QR.',
              'W dniu wydarzenia obsługa skanuje kody przy wejściu, a Ty patrzysz na Dashboard.',
              'Po wszystkim pobierasz raport PDF i wysyłasz go klientowi.',
            ],
          },
          {
            kind: 'tip',
            text: 'Nie musisz robić tego po kolei. Listę gości możesz uzupełniać do ostatniej chwili, '
              + 'a program zmieniać nawet w trakcie — goście zobaczą aktualną wersję w swojej aplikacji.',
          },
        ],
      },
      {
        id: 'pomoc',
        title: 'Znak zapytania w rogu',
        blocks: [
          {
            kind: 'text',
            text: 'W każdym miejscu aplikacji, obok tytułu ekranu, znajdziesz mały znak zapytania. '
              + 'Kliknięcie otwiera ten podręcznik dokładnie na opisie miejsca, w którym właśnie jesteś — '
              + 'w nowej karcie, więc nie tracisz tego, co robisz.',
          },
        ],
      },
    ],
  },

  {
    slug: 'wydarzenia',
    title: 'Wydarzenia',
    summary: 'Tworzenie wydarzenia, terminy, miejsce i co oznaczają statusy.',
    icon: 'calendar',
    group: 'Na start',
    sections: [
      {
        id: 'nowe',
        title: 'Nowe wydarzenie',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Na liście wydarzeń kliknij „Nowe wydarzenie”.',
              'Podaj nazwę — zobaczą ją goście w mailach i w aplikacji.',
              'Ustaw datę i godzinę rozpoczęcia oraz zakończenia.',
              'Wpisz miejsce. Ten adres trafia do zaproszeń i do maila z kodem QR.',
            ],
          },
          {
            kind: 'tip',
            text: 'Godziny podajesz w czasie polskim — takim, jaki widzi gość. Aplikacja sama dba o to, '
              + 'żeby wszędzie pokazywały się identycznie.',
          },
        ],
      },
      {
        id: 'statusy',
        title: 'Statusy wydarzenia',
        blocks: [
          {
            kind: 'list',
            items: [
              'Szkic — pracujesz nad wydarzeniem, nic nie jest publiczne.',
              'Opublikowane — strona wydarzenia jest dostępna, można wysyłać zaproszenia.',
              'Na żywo — trwa. Dashboard pokazuje wejścia na bieżąco.',
              'Zakończone — po wszystkim. Wtedy pobierasz raport.',
              'Zarchiwizowane — schowane z głównej listy, dane zostają.',
            ],
          },
        ],
      },
    ],
  },

  {
    slug: 'uczestnicy',
    title: 'Uczestnicy',
    summary: 'Lista gości, import z Excela, zaproszenia, kody QR i wiadomości.',
    icon: 'users',
    group: 'Prowadzenie wydarzenia',
    sections: [
      {
        id: 'dodawanie',
        title: 'Jak dodać gości',
        blocks: [
          {
            kind: 'text',
            text: 'Są dwa sposoby. Przy większej liście wygodniejszy jest import z Excela; '
              + 'pojedyncze osoby dopisujesz ręcznie.',
          },
          {
            kind: 'steps',
            items: [
              'Import: kliknij „Importuj”, wybierz plik Excel i sprawdź podgląd.',
              'Aplikacja pokaże, co wczyta i co jest nie tak — dopiero potem potwierdzasz.',
              'Pojedynczo: kliknij „Dodaj uczestnika”, wpisz imię, nazwisko i adres e-mail.',
            ],
          },
          {
            kind: 'warn',
            text: 'Dodanie gościa NIE wysyła żadnego maila. To celowe — inaczej przy uzupełnianiu listy '
              + 'goście dostawaliby wiadomości pojedynczo, w przypadkowej kolejności. Maile wysyłasz sam, przyciskiem.',
          },
        ],
      },
      {
        id: 'zaproszenia',
        title: 'Wysyłanie zaproszeń',
        blocks: [
          {
            kind: 'text',
            text: 'Jedno zaproszenie to dwa osobne maile. Pierwszy ma przycisk logowania do aplikacji, '
              + 'drugi zawiera kod QR w treści i w załączniku. Rozdzieliliśmy je, bo pod drzwiami gość szuka '
              + 'w skrzynce kodu, a nie zaproszenia.',
          },
          {
            kind: 'list',
            items: [
              'Mail z kodem ma zawsze ten sam tytuł: „Twój kod QR / Your QR code: nazwa wydarzenia”. Dzięki temu każdy znajdzie go wyszukiwarką skrzynki.',
              'Przycisk „Wyślij zaproszenia” na górze listy wysyła do wszystkich uprawnionych gości.',
              'Przyciski na karcie gościa wysyłają do jednej osoby: całe zaproszenie albo sam kod QR.',
            ],
          },
        ],
      },
      {
        id: 'wiadomosc',
        title: 'Wiadomość do gości',
        blocks: [
          {
            kind: 'text',
            text: 'Gdy trzeba coś przekazać na już — „autokar podstawiony”, „zmiana sali” — użyj przycisku '
              + '„Wiadomość”. Piszesz własny tytuł i treść, a mail wychodzi w kolorach wydarzenia.',
          },
          {
            kind: 'tip',
            text: 'Wiadomość idzie dokładnie do tych osób, które widzisz na liście. Jeśli zawęzisz filtr do '
              + '„Na miejscu”, dostaną ją tylko goście, którzy już dotarli. Licznik na przycisku zawsze pokazuje, '
              + 'do ilu osób pójdzie.',
          },
          {
            kind: 'text',
            text: 'Polska treść jest wymagana, angielska nieobowiązkowa. Gość z ustawionym językiem angielskim '
              + 'dostanie wersję angielską, a jeśli jej nie napiszesz — polską.',
          },
        ],
      },
      {
        id: 'towarzyszace',
        title: 'Osoby towarzyszące',
        blocks: [
          {
            kind: 'text',
            text: 'Jeśli w ustawieniach wydarzenia włączysz osoby towarzyszące, gość sam dopisze swoje '
              + 'osiągalne przez siebie osoby w aplikacji. Nie mają własnego adresu e-mail ani logowania — '
              + 'mają swój kod QR i liczą się do frekwencji.',
          },
        ],
      },
      {
        id: 'faq-uczestnicy',
        title: 'Częste pytania',
        blocks: [
          {
            kind: 'faq',
            items: [
              {
                q: 'Gość nie dostał maila. Co robić?',
                a: 'Sprawdź, czy adres jest poprawny na jego karcie, a potem wyślij ponownie przyciskiem na tej karcie. '
                  + 'Poproś też o zajrzenie do spamu — pierwsze maile z nowego adresu czasem tam trafiają.',
              },
              {
                q: 'Gość zgubił kod QR.',
                a: 'Otwórz jego kartę i kliknij „Wyślij kod QR”. Dostanie sam kod, bez zaproszenia. '
                  + 'Kod jest też zawsze w jego aplikacji, po zalogowaniu linkiem.',
              },
              {
                q: 'Czy mogę wysłać zaproszenie drugi raz?',
                a: 'Tak, dowolną liczbę razy. Kod QR gościa się nie zmienia, więc stary mail dalej działa.',
              },
              {
                q: 'Jak wyeksportować listę?',
                a: 'Przycisk eksportu na liście uczestników pobiera plik Excel ze wszystkimi danymi i statusami.',
              },
            ],
          },
        ],
      },
    ],
  },

  {
    slug: 'agenda',
    title: 'Agenda',
    summary: 'Program dnia, punkty tylko dla grup, punkty z kodem QR i powiadamianie o zmianach.',
    icon: 'calendar',
    group: 'Prowadzenie wydarzenia',
    sections: [
      {
        id: 'punkty',
        title: 'Dodawanie punktów programu',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Kliknij „Dodaj punkt”.',
              'Wpisz nazwę, godzinę rozpoczęcia i zakończenia.',
              'Opcjonalnie dodaj miejsce, prowadzącego, opis albo menu.',
              'Zapisz. Punkt od razu widać w aplikacji gościa.',
            ],
          },
        ],
      },
      {
        id: 'grupy',
        title: 'Punkty tylko dla wybranej grupy',
        blocks: [
          {
            kind: 'text',
            text: 'Jeśli część gości jedzie autokarem, a część przyjeżdża sama, przypisz punkt do grupy. '
              + 'Zobaczą go wyłącznie osoby z tej grupy — reszta nie dostanie mylącej informacji.',
          },
        ],
      },
      {
        id: 'qr',
        title: 'Punkt z kodem QR',
        blocks: [
          {
            kind: 'text',
            text: 'Zaznacz „wymaga potwierdzenia kodem QR”, jeśli chcesz wiedzieć, kto faktycznie był w danym '
              + 'punkcie — na przykład kto wsiadł do autokaru. Taki punkt pojawia się automatycznie na liście '
              + 'do wyboru w skanerze.',
          },
          {
            kind: 'tip',
            text: 'Jedna osoba w jednym punkcie liczy się raz, choćby pokazała kod pięć razy. '
              + 'W innym punkcie to już osobne potwierdzenie.',
          },
        ],
      },
      {
        id: 'powiadom',
        title: 'Powiadamianie o zmianach',
        blocks: [
          {
            kind: 'warn',
            text: 'Zmiana w agendzie NIE wysyła maili automatycznie. Gdy chcesz poinformować gości, '
              + 'klikasz „Powiadom uczestników o zmianach” — wtedy idzie jedna wiadomość z całym aktualnym programem.',
          },
          {
            kind: 'text',
            text: 'Każdy gość dostaje program w swoim języku i tylko te punkty, które go dotyczą.',
          },
        ],
      },
    ],
  },

  {
    slug: 'skaner',
    title: 'Skaner kodów QR',
    summary: 'Jak obsługa sprawdza gości przy wejściu i co oznaczają kolory na ekranie.',
    icon: 'qr',
    group: 'W dniu wydarzenia',
    sections: [
      {
        id: 'link',
        title: 'Link dla obsługi',
        blocks: [
          {
            kind: 'text',
            text: 'Obsługa przy wejściu nie zakłada konta. Wysyłasz jej jeden link, który otwiera sam skaner '
              + 'i nic poza nim. Link działa tydzień.',
          },
          {
            kind: 'steps',
            items: [
              'Wejdź w wydarzenie i skopiuj link operatora.',
              'Wyślij go osobie przy wejściu — SMS-em albo mailem.',
              'Otwiera link na telefonie i zgadza się na dostęp do aparatu.',
            ],
          },
          {
            kind: 'warn',
            text: 'Aparat działa tylko na stronie z adresem https. Jeśli obsługa nie widzi obrazu z kamery, '
              + 'najczęściej znaczy to, że odmówiła dostępu — trzeba go włączyć w ustawieniach przeglądarki.',
          },
        ],
      },
      {
        id: 'stanowisko',
        title: 'Wybór stanowiska',
        blocks: [
          {
            kind: 'text',
            text: 'Po otwarciu skaner pyta, gdzie stoisz. Zawsze dostępne są Wejście i Wyjście, a pod nimi '
              + 'punkty z agendy i stanowiska, które sam dodałeś.',
          },
          {
            kind: 'list',
            items: [
              'Wejście — melduje gościa i zmienia jego status na „na miejscu”.',
              'Wyjście — odnotowuje, że gość opuścił wydarzenie.',
              'Pozostałe punkty — potwierdzają obecność, nie zmieniają statusu.',
            ],
          },
          {
            kind: 'tip',
            text: 'Wybór wejścia albo wyjścia od razu blokuje kierunek, żeby przy drzwiach nikt przez pomyłkę '
              + 'nie zameldował wychodzących. Kłódką obok możesz to odblokować. Stanowisko zmienisz w każdej '
              + 'chwili przyciskiem u góry ekranu.',
          },
        ],
      },
      {
        id: 'kolory',
        title: 'Co znaczą kolory',
        blocks: [
          {
            kind: 'list',
            items: [
              'Zielony — wszystko w porządku, gość wpuszczony. Zobaczysz imię, nazwisko i stolik.',
              'Pomarańczowy — ta osoba była już tu odbita. Pod spodem godzina pierwszego skanu.',
              'Czerwony — kod nieznany. To nie jest gość tego wydarzenia albo kod pochodzi skądinąd.',
            ],
          },
          {
            kind: 'text',
            text: 'Ekran sam znika po chwili i skaner jest gotowy na następną osobę. Można też stuknąć w niego, '
              + 'żeby przyspieszyć.',
          },
        ],
      },
      {
        id: 'bez-zasiegu',
        title: 'Gdy nie ma zasięgu',
        blocks: [
          {
            kind: 'text',
            text: 'Skaner działa bez internetu. Odbicia zapisują się w telefonie i wysyłają same, gdy zasięg wróci. '
              + 'U góry widać, ile skanów czeka w kolejce.',
          },
        ],
      },
      {
        id: 'faq-skaner',
        title: 'Częste pytania',
        blocks: [
          {
            kind: 'faq',
            items: [
              {
                q: 'Kod z ekranu telefonu nie chce się zeskanować.',
                a: 'Poproś gościa, żeby podniósł jasność ekranu i wyłączył tryb ciemny. W aplikacji gościa jest '
                  + 'przycisk „Powiększ kod”, który pokazuje kod na całym białym ekranie — wtedy skanuje się najlepiej.',
              },
              {
                q: 'Gość nie ma telefonu przy sobie.',
                a: 'Użyj pola „wpisz ręcznie” pod podglądem kamery. Możesz wkleić kod z maila gościa.',
              },
              {
                q: 'Czy mogę zeskanować kogoś dwa razy?',
                a: 'Tak, nic się nie zepsuje. Przy wejściu zobaczysz ostrzeżenie, że osoba już jest na miejscu, '
                  + 'a w punkcie z agendy odbicie policzy się tylko raz.',
              },
            ],
          },
        ],
      },
    ],
  },

  {
    slug: 'dashboard',
    title: 'Dashboard i raport',
    summary: 'Podgląd na żywo w dniu wydarzenia i raport PDF dla klienta.',
    icon: 'dashboard',
    group: 'W dniu wydarzenia',
    sections: [
      {
        id: 'na-zywo',
        title: 'Podgląd na żywo',
        blocks: [
          {
            kind: 'text',
            text: 'Dashboard pokazuje, ilu gości już dotarło, ilu potwierdziło udział i kto właśnie się zameldował. '
              + 'Liczby odświeżają się same w miarę skanowania.',
          },
        ],
      },
      {
        id: 'raport',
        title: 'Raport PDF',
        blocks: [
          {
            kind: 'text',
            text: 'Przycisk pobrania raportu tworzy gotowy dokument dla klienta — w kolorach wydarzenia, '
              + 'z frekwencją, wykresem przyjść, programem, punktami kontrolnymi i opiniami gości.',
          },
          {
            kind: 'tip',
            text: 'Raport możesz pobrać w każdej chwili, także w trakcie wydarzenia. Sekcje, dla których nie ma '
              + 'jeszcze danych, po prostu się nie pojawią.',
          },
        ],
      },
    ],
  },

  {
    slug: 'stanowiska',
    title: 'Stanowiska',
    summary: 'Własne punkty skanowania: bar, szatnia, konkurs — z limitem na osobę.',
    icon: 'station',
    group: 'W dniu wydarzenia',
    sections: [
      {
        id: 'po-co',
        title: 'Po co stanowiska',
        blocks: [
          {
            kind: 'text',
            text: 'Stanowisko to własny punkt skanowania poza wejściem — bar z napojami w cenie, szatnia, '
              + 'odbiór upominku. Obsługa wybiera je w skanerze tak samo jak wejście.',
          },
        ],
      },
      {
        id: 'limit',
        title: 'Limit na osobę',
        blocks: [
          {
            kind: 'list',
            items: [
              'Limit 0 — bez ograniczeń, można skanować dowolnie często.',
              'Limit 1 — każdy gość raz, na przykład jeden upominek na osobę.',
              'Limit 2 i więcej — tyle razy, ile ustawisz. Po wyczerpaniu skaner pokaże ostrzeżenie.',
            ],
          },
        ],
      },
    ],
  },

  {
    slug: 'strona',
    title: 'Strona wydarzenia',
    summary: 'Publiczna strona z programem i zapisami — układana z gotowych bloków.',
    icon: 'document',
    group: 'Wygląd i treść',
    sections: [
      {
        id: 'edytor',
        title: 'Jak działa edytor',
        blocks: [
          {
            kind: 'text',
            text: 'Stronę układasz z gotowych bloków: nagłówek, program, mapa, odliczanie, formularz zapisu. '
              + 'Klikasz w tekst na podglądzie i piszesz — tak jak w dokumencie.',
          },
          {
            kind: 'steps',
            items: [
              'Wybierz szablon albo zacznij od pustej strony.',
              'Dodaj bloki i poprzestawiaj je przeciąganiem.',
              'Ustaw kolory i logo — te same kolory trafią do raportu PDF.',
              'Kliknij „Publikuj”, żeby strona stała się widoczna.',
            ],
          },
          {
            kind: 'warn',
            text: 'Zapisanie zmian to nie to samo co publikacja. Dopóki nie klikniesz „Publikuj”, '
              + 'goście widzą poprzednią wersję. Aplikacja ostrzeże Cię, gdy masz niezapisane publicznie zmiany.',
          },
        ],
      },
      {
        id: 'adres',
        title: 'Adres strony',
        blocks: [
          {
            kind: 'text',
            text: 'Każde wydarzenie ma własny, czytelny adres — możesz go zmienić na taki, który łatwo podyktować '
              + 'przez telefon. Poprzednie wersje strony są zapisywane, więc zawsze da się wrócić do wcześniejszej.',
          },
        ],
      },
    ],
  },

  {
    slug: 'maile',
    title: 'Wygląd maili',
    summary: 'Kolor, logo, nadawca i tytuł wiadomości wysyłanych do gości.',
    icon: 'mail',
    group: 'Wygląd i treść',
    sections: [
      {
        id: 'branding',
        title: 'Co możesz ustawić',
        blocks: [
          {
            kind: 'list',
            items: [
              'Kolor akcentu — pasek i przyciski w mailu.',
              'Logo — pokazuje się na górze każdej wiadomości.',
              'Nazwa nadawcy — to widzi gość w skrzynce zamiast „EventPulse”.',
              'Tytuł zaproszenia — możesz wpisać własny, np. „Zaproszenie na otwarcie biura”.',
            ],
          },
          {
            kind: 'tip',
            text: 'Własny tytuł dotyczy zaproszenia. Mail z kodem QR zawsze ma stały tytuł „Twój kod QR…”, '
              + 'żeby gość odnalazł go w skrzynce pod drzwiami.',
          },
        ],
      },
    ],
  },

  {
    slug: 'formularz',
    title: 'Formularz zgłoszeniowy',
    summary: 'Własne pytania do gości i ekrany powitalne w aplikacji.',
    icon: 'document',
    group: 'Wygląd i treść',
    sections: [
      {
        id: 'pytania',
        title: 'Własne pytania',
        blocks: [
          {
            kind: 'text',
            text: 'Możesz dopisać dowolne pytania, na które gość odpowie po zalogowaniu: wybór menu, '
              + 'rozmiar koszulki, udział w części wieczornej. Odpowiedzi zobaczysz na karcie gościa '
              + 'i w eksporcie do Excela.',
          },
          {
            kind: 'list',
            items: [
              'Pole tekstowe — krótka odpowiedź własnymi słowami.',
              'Tak / Nie — prosty wybór.',
              'Lista — jedna odpowiedź z kilku.',
              'Wielokrotny wybór — kilka odpowiedzi naraz, z możliwością wykluczeń.',
            ],
          },
        ],
      },
    ],
  },

  {
    slug: 'ustawienia',
    title: 'Ustawienia wydarzenia',
    summary: 'Zgody, osoby towarzyszące, widoczne zakładki i prywatność.',
    icon: 'cog',
    group: 'Ustawienia',
    sections: [
      {
        id: 'zgody',
        title: 'Zgody i prywatność',
        blocks: [
          {
            kind: 'text',
            text: 'Gość akceptuje regulamin przy pierwszym logowaniu. Osobno pytamy o zgodę na zdjęcia — '
              + 'bez niej jego wizerunek nie trafia do galerii.',
          },
          {
            kind: 'text',
            text: 'Możesz też włączyć automatyczne czyszczenie danych osobowych po zadanej liczbie dni od '
              + 'wydarzenia. Statystyki zostają, dane osobowe znikają.',
          },
        ],
      },
      {
        id: 'zakladki',
        title: 'Co widzi gość',
        blocks: [
          {
            kind: 'text',
            text: 'Przełącznikami decydujesz, które zakładki pojawią się w aplikacji gościa: program, atrakcje, '
              + 'galeria, hotel, preferencje. Wyłączone po prostu nie istnieją — nie ma pustych ekranów.',
          },
        ],
      },
    ],
  },

  {
    slug: 'zespol',
    title: 'Zespół i klienci',
    summary: 'Konta dla współpracowników i dostęp dla klienta.',
    icon: 'shield',
    group: 'Ustawienia',
    sections: [
      {
        id: 'konta',
        title: 'Zakładanie kont',
        blocks: [
          {
            kind: 'list',
            items: [
              'Konto agencji — pełny dostęp do wszystkich wydarzeń.',
              'Konto klienta — dostęp tylko do przypisanych mu wydarzeń, bez ustawień technicznych.',
            ],
          },
          {
            kind: 'tip',
            text: 'Klient widzi to samo co Ty w zakładkach z treścią, ale nie zmieni rzeczy, które mogłyby '
              + 'zepsuć wydarzenie. To bezpieczny sposób, żeby dać mu wgląd na bieżąco.',
          },
        ],
      },
    ],
  },

  {
    slug: 'aplikacja-goscia',
    title: 'Aplikacja gościa',
    summary: 'Co gość widzi na telefonie i jak się loguje.',
    icon: 'users',
    group: 'Prowadzenie wydarzenia',
    sections: [
      {
        id: 'logowanie',
        title: 'Jak gość się loguje',
        blocks: [
          {
            kind: 'text',
            text: 'Gość nie ma hasła. Klika link ze swojego maila i od razu jest zalogowany. '
              + 'Link jest osobisty — nie należy go przekazywać dalej.',
          },
        ],
      },
      {
        id: 'co-widzi',
        title: 'Co tam znajdzie',
        blocks: [
          {
            kind: 'list',
            items: [
              'Swój kod QR, z przyciskiem powiększenia na cały ekran.',
              'Program dnia — tylko punkty, które go dotyczą.',
              'Swoje dane i odpowiedzi na Twoje pytania.',
              'Galerię zdjęć, jeśli ją włączysz.',
            ],
          },
        ],
      },
    ],
  },

  {
    slug: 'audyt',
    title: 'Historia zmian',
    summary: 'Kto i kiedy co zmienił w wydarzeniu.',
    icon: 'shield',
    group: 'Ustawienia',
    sections: [
      {
        id: 'co-zapisujemy',
        title: 'Co jest zapisywane',
        blocks: [
          {
            kind: 'text',
            text: 'Każda zmiana zostawia ślad: kto ją wykonał, kiedy i czego dotyczyła. Przydaje się, gdy trzeba '
              + 'ustalić, skąd wzięła się nieoczekiwana zmiana w programie albo na liście gości.',
          },
          {
            kind: 'text',
            text: 'Hasła i osobiste kody gości nigdy nie są w historii zapisywane — widać sam fakt zdarzenia, '
              + 'nie dane, które pozwoliłyby się pod kogoś podszyć.',
          },
        ],
      },
    ],
  },
]

export const findArticle = (slug: string | undefined) =>
  ARTICLES.find((a) => a.slug === slug)
