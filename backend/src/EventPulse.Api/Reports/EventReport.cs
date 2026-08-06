using System.Globalization;
using EventPulse.Modules.Agenda.Application;
using EventPulse.Modules.Content.Application;
using EventPulse.Modules.Events.Application;
using EventPulse.Modules.Participants.Application.Feedback;
using EventPulse.Modules.Scanning.Application;
using EventPulse.Shared.Time;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EventPulse.Api.Reports;

/// <summary>
/// The post-event report: a keepsake the agency hands to its client, printed in the event's own
/// colours. Landscape 16:9 rather than A4 because it is read on a screen and presented, not filed.
/// Every page is skipped when it has nothing to say — an empty section reads as a failure, and a
/// report that promises "Opinie" and then shows a dash is worse than one that never mentions them.
/// </summary>
public static class EventReport
{
    private static readonly PageSize Deck = new(958, 538);
    private static readonly CultureInfo Pl = new("pl-PL");

    public static byte[] Build(
        EventDto ev,
        BrandingDto branding,
        DashboardDto dashboard,
        EventReportStatsDto stats,
        FeedbackSummaryDto feedback,
        IReadOnlyList<AgendaItemDto> agenda)
    {
        var p = new ReportPalette(branding.PrimaryColor, branding.SecondaryColor, branding.AccentColor);

        return Document.Create(doc =>
        {
            Cover(doc, p, ev, stats);
            Summary(doc, p, ev, stats, feedback, agenda);
            Attendance(doc, p, stats, ev.Name);

            if (stats.Arrivals.Count > 0)
            {
                Arrivals(doc, p, stats, ev.Name);
            }

            if (agenda.Count > 0)
            {
                Agenda(doc, p, agenda, ev.Name);
            }

            if (stats.Checkpoints.Count > 0)
            {
                Checkpoints(doc, p, stats, ev.Name);
            }

            if (stats.Companies.Count > 0 || stats.Groups.Count > 0 || stats.Dietary.Count > 0)
            {
                Guests(doc, p, stats, ev.Name);
            }

            if (feedback.Count > 0)
            {
                Feedback(doc, p, feedback, ev.Name);
            }

            Closing(doc, p, ev);
        }).GeneratePdf();
    }

    // ───────────────────────────── pages ─────────────────────────────

    private static void Cover(IDocumentContainer doc, ReportPalette p, EventDto ev, EventReportStatsDto stats)
        => doc.Page(page =>
        {
            Splash(page, p);

            page.Content().AlignMiddle().Column(col =>
            {
                col.Item().Text("RAPORT POWYDARZENIOWY")
                    .FontSize(8).Bold().LetterSpacing(0.28f).FontColor(p.Primary);

                col.Item().PaddingTop(34).MaxWidth(620).Text(ev.Name)
                    .FontSize(46).Bold().LineHeight(1.05f).FontColor(p.Ink);

                col.Item().PaddingTop(16).MaxWidth(430).Text(Headline(stats))
                    .FontSize(11.5f).LineHeight(1.55f).FontColor(p.Muted);

                // Constrained so the four labels read as one tight block, the way a title page
                // groups its credits — spread across the full 958 pt they stop being a group.
                col.Item().PaddingTop(50).MaxWidth(660).Row(row =>
                {
                    Meta(row, p, "TERMIN", Local(ev.StartsAt).ToString("d MMMM yyyy", Pl));
                    Meta(row, p, "MIEJSCE", string.IsNullOrWhiteSpace(ev.Location) ? "—" : ev.Location);
                    Meta(row, p, "GOŚCI", stats.Guests.ToString(Pl));
                    Meta(row, p, "FREKWENCJA", $"{stats.AttendancePct.ToString("0.#", Pl)}%");
                });
            });
        });

    private static void Summary(
        IDocumentContainer doc,
        ReportPalette p,
        EventDto ev,
        EventReportStatsDto stats,
        FeedbackSummaryDto feedback,
        IReadOnlyList<AgendaItemDto> agenda)
        => doc.Page(page =>
        {
            Shell(page, p, "01", "PODSUMOWANIE", ev.Name);

            page.Content().AlignMiddle().Column(col =>
            {
                Title(col, p, "Wydarzenie w liczbach");

                col.Item().PaddingTop(30).Row(row =>
                {
                    Big(row, p, stats.CheckedIn.ToString(Pl), "gości na miejscu");
                    Big(row, p, $"{stats.AttendancePct.ToString("0.#", Pl)}%", "frekwencji");
                    Big(row, p, agenda.Count.ToString(Pl), "punktów programu");
                });

                col.Item().PaddingTop(26).LineHorizontal(0.7f).LineColor(p.Hairline);

                col.Item().PaddingTop(24).Row(row =>
                {
                    Big(row, p, stats.TotalScans.ToString(Pl), "skanów kodów QR", small: true);
                    Big(row, p, Duration(stats), "średni czas na miejscu", small: true);
                    Big(row, p, feedback.Count > 0 ? feedback.Average.ToString("0.0", Pl) : "—", "średnia ocena", small: true);
                    Big(row, p, stats.Companions > 0 ? stats.Companions.ToString(Pl) : "—", "osób towarzyszących", small: true);
                });

                col.Item().PaddingTop(30).Text(Window(ev, stats))
                    .FontSize(10).LineHeight(1.5f).FontColor(p.Muted);
            });
        });

    private static void Attendance(IDocumentContainer doc, ReportPalette p, EventReportStatsDto stats, string ev)
        => doc.Page(page =>
        {
            Shell(page, p, "02", "FREKWENCJA", ev);

            page.Content().AlignMiddle().Column(col =>
            {
                Title(col, p, "Kto był na miejscu");

                col.Item().PaddingTop(28).Row(row =>
                {
                    row.ConstantItem(210).Column(ring =>
                    {
                        ring.Item().Width(160).Height(160)
                            .Svg(ReportCharts.Ring(stats.AttendancePct, p.Tint, p.Primary));
                        ring.Item().PaddingTop(14).Width(160).AlignCenter()
                            .Text($"{stats.AttendancePct.ToString("0.#", Pl)}%")
                            .FontSize(26).Bold().FontColor(p.Primary);
                        ring.Item().Width(160).AlignCenter().Text("obecnych")
                            .FontSize(8).FontColor(p.Muted);
                    });

                    row.RelativeItem().PaddingLeft(30).Column(bars =>
                    {
                        var top = Math.Max(stats.Guests + stats.Companions, 1);
                        Bar(bars, p, "Na liście gości", stats.Guests + stats.Companions, top, p.Tint);
                        Bar(bars, p, "Potwierdziło udział", stats.Confirmed, top, p.Secondary);
                        Bar(bars, p, "Zameldowanych na wejściu", stats.CheckedIn, top, p.Primary);
                        Bar(bars, p, "Wymeldowanych na wyjściu", stats.CheckedOut, top, ReportPalette.Mix(p.Primary, "#ffffff", 0.45));
                        Bar(bars, p, "Nieobecnych", stats.NoShow, top, p.Hairline, mutedValue: true);

                        if (stats.Declined > 0)
                        {
                            bars.Item().PaddingTop(16).Text(
                                    $"Udziału odmówiło {stats.Declined.ToString(Pl)} zaproszonych — nie liczymy ich jako nieobecnych.")
                                .FontSize(8.5f).FontColor(p.Muted);
                        }
                    });
                });
            });
        });

    private static void Arrivals(IDocumentContainer doc, ReportPalette p, EventReportStatsDto stats, string ev)
        => doc.Page(page =>
        {
            Shell(page, p, "03", "PRZEBIEG DNIA", ev);

            page.Content().AlignMiddle().Column(col =>
            {
                Title(col, p, "Jak schodzili się goście");

                var values = stats.Arrivals.Select(a => a.Count).ToList();

                col.Item().PaddingTop(26).Height(170)
                    .Svg(ReportCharts.Columns(values, p.Tint, p.Primary));

                col.Item().PaddingTop(6).LineHorizontal(0.7f).LineColor(p.Hairline);

                // Only the ends are labelled: one tick per quarter of an hour would be unreadable,
                // and the shape plus its bounds is what the eye actually uses.
                col.Item().PaddingTop(6).Row(row =>
                {
                    row.RelativeItem().Text(Time(stats.Arrivals[0].At)).FontSize(8).FontColor(p.Muted);
                    row.RelativeItem().AlignRight()
                        .Text(Time(stats.Arrivals[^1].At)).FontSize(8).FontColor(p.Muted);
                });

                col.Item().PaddingTop(30).Row(row =>
                {
                    Big(row, p, Time(stats.FirstCheckIn), "pierwszy gość", small: true);
                    Big(row, p, Time(stats.PeakAt), $"szczyt — {stats.PeakArrivals.ToString(Pl)} os. w 15 min", small: true);
                    Big(row, p, Time(stats.LastCheckIn), "ostatni gość", small: true);
                    Big(row, p, Spread(stats), "trwało zameldowanie", small: true);
                });
            });
        });

    private static void Agenda(IDocumentContainer doc, ReportPalette p, IReadOnlyList<AgendaItemDto> agenda, string ev)
        => doc.Page(page =>
        {
            Shell(page, p, "04", "PROGRAM", ev);

            page.Content().Column(col =>
            {
                Title(col, p, "Przebieg wydarzenia");

                col.Item().PaddingTop(24).Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(96);
                        c.RelativeColumn(3);
                        c.RelativeColumn(2);
                        c.RelativeColumn(2);
                    });

                    Head(table, p, "GODZINA");
                    Head(table, p, "PUNKT PROGRAMU");
                    Head(table, p, "MIEJSCE");
                    Head(table, p, "PROWADZĄCY");

                    foreach (var item in agenda.OrderBy(a => a.StartsAt))
                    {
                        Cell(table, p).Text($"{Time(item.StartsAt)}–{Time(item.EndsAt)}")
                            .FontSize(9).Bold().FontColor(p.Primary);

                        Cell(table, p).Column(c =>
                        {
                            c.Item().Text(item.TitlePl).FontSize(9.5f).Bold().FontColor(p.Ink);
                            if (item.RequiresCheckIn)
                            {
                                c.Item().PaddingTop(2).Text("punkt kontrolny · kod QR")
                                    .FontSize(7.5f).FontColor(p.Secondary);
                            }
                        });

                        Cell(table, p).Text(Dash(item.LocationName)).FontSize(9).FontColor(p.Muted);
                        Cell(table, p).Text(Dash(item.SpeakerName)).FontSize(9).FontColor(p.Muted);
                    }
                });
            });
        });

    private static void Checkpoints(IDocumentContainer doc, ReportPalette p, EventReportStatsDto stats, string ev)
        => doc.Page(page =>
        {
            Shell(page, p, "05", "PUNKTY KONTROLNE", ev);

            page.Content().AlignMiddle().Column(col =>
            {
                Title(col, p, "Co zobaczyły skanery");

                var top = Math.Max(stats.Checkpoints.Max(c => c.People), 1);

                col.Item().PaddingTop(24).Column(bars =>
                {
                    foreach (var point in stats.Checkpoints)
                    {
                        Bar(bars, p, point.Code, point.People, top, p.Primary,
                            note: point.First is null ? null : $"{Time(point.First)}–{Time(point.Last)}");
                    }
                });

                col.Item().PaddingTop(24).Text(
                        "Liczymy osoby, nie odbicia: jeden gość w jednym punkcie to jeden wpis, niezależnie od tego "
                        + "ile razy pokazał kod.")
                    .FontSize(8.5f).FontColor(p.Muted);
            });
        });

    private static void Guests(IDocumentContainer doc, ReportPalette p, EventReportStatsDto stats, string ev)
        => doc.Page(page =>
        {
            Shell(page, p, "06", "GOŚCIE", ev);

            page.Content().AlignMiddle().Column(col =>
            {
                Title(col, p, "Kogo gościliśmy");

                col.Item().PaddingTop(26).Row(row =>
                {
                    row.RelativeItem().Column(left =>
                    {
                        if (stats.Companies.Count > 0)
                        {
                            Subhead(left, p, "Firmy");
                            var top = Math.Max(stats.Companies.Max(c => c.Count), 1);
                            foreach (var slice in stats.Companies.Take(8))
                            {
                                Bar(left, p, slice.Label, slice.Count, top, p.Primary, compact: true);
                            }
                        }
                    });

                    row.ConstantItem(36);

                    row.RelativeItem().Column(right =>
                    {
                        if (stats.Groups.Count > 0)
                        {
                            Subhead(right, p, "Grupy");
                            var top = Math.Max(stats.Groups.Max(g => g.Count), 1);
                            foreach (var slice in stats.Groups.Take(5))
                            {
                                Bar(right, p, slice.Label, slice.Count, top, p.Secondary, compact: true);
                            }
                        }

                        if (stats.Dietary.Count > 0)
                        {
                            right.Item().PaddingTop(stats.Groups.Count > 0 ? 22 : 0).Element(e => Subhead(e, p, "Preferencje kuchni"));
                            foreach (var slice in stats.Dietary.Take(5))
                            {
                                right.Item().PaddingTop(4).Row(r =>
                                {
                                    r.RelativeItem().Text(slice.Label).FontSize(9).FontColor(p.Ink);
                                    r.ConstantItem(40).AlignRight()
                                        .Text($"{slice.Count.ToString(Pl)} os.").FontSize(9).Bold().FontColor(p.Accent);
                                });
                            }
                        }
                    });
                });
            });
        });

    private static void Feedback(IDocumentContainer doc, ReportPalette p, FeedbackSummaryDto feedback, string ev)
        => doc.Page(page =>
        {
            Shell(page, p, "07", "OPINIE", ev);

            page.Content().AlignMiddle().Column(col =>
            {
                Title(col, p, "Co powiedzieli goście");

                col.Item().PaddingTop(26).Row(row =>
                {
                    row.ConstantItem(232).Column(score =>
                    {
                        score.Item().Text(feedback.Average.ToString("0.0", Pl))
                            .FontSize(58).Bold().FontColor(p.Primary);
                        score.Item().Text($"na 5 · {feedback.Count.ToString(Pl)} odpowiedzi")
                            .FontSize(9).FontColor(p.Muted);

                        var top = Math.Max(feedback.Items.Count, 1);
                        score.Item().PaddingTop(16).Column(dist =>
                        {
                            for (var stars = 5; stars >= 1; stars--)
                            {
                                var count = feedback.Items.Count(i => i.Rating == stars);
                                Bar(dist, p, new string('★', stars), count, top, p.Accent, compact: true);
                            }
                        });
                    });

                    row.RelativeItem().PaddingLeft(34).Column(quotes =>
                    {
                        var comments = feedback.Items
                            .Where(i => !string.IsNullOrWhiteSpace(i.Comment))
                            .Take(6)
                            .ToList();

                        if (comments.Count == 0)
                        {
                            quotes.Item().Text("Goście ocenili wydarzenie, ale nie zostawili komentarzy.")
                                .FontSize(9.5f).FontColor(p.Muted);
                            return;
                        }

                        foreach (var comment in comments)
                        {
                            quotes.Item().PaddingBottom(12)
                                .BorderLeft(2).BorderColor(p.Tint).PaddingLeft(12)
                                .Column(c =>
                                {
                                    c.Item().Text($"„{comment.Comment!.Trim()}”")
                                        .FontSize(9.5f).LineHeight(1.45f).Italic().FontColor(p.Ink);
                                    c.Item().PaddingTop(3).Text(new string('★', comment.Rating))
                                        .FontSize(8).FontColor(p.Accent);
                                });
                        }
                    });
                });
            });
        });

    private static void Closing(IDocumentContainer doc, ReportPalette p, EventDto ev)
        => doc.Page(page =>
        {
            Splash(page, p);

            page.Content().AlignMiddle().Column(col =>
            {
                col.Item().AlignCenter().Width(54).Height(54)
                    .Svg(ReportCharts.Ring(100, p.Tint, p.Primary, thickness: 46));

                col.Item().PaddingTop(28).AlignCenter().Text("Dziękujemy za wspólne wydarzenie")
                    .FontSize(28).Bold().FontColor(p.Ink);

                col.Item().PaddingTop(12).AlignCenter().MaxWidth(430).Text(
                        $"Raport przygotowany na podstawie danych zebranych podczas „{ev.Name}”. "
                        + "Wszystkie liczby pochodzą z odbić kodów QR i odpowiedzi gości.")
                    .FontSize(10).LineHeight(1.55f).FontColor(p.Muted);

                col.Item().PaddingTop(30).AlignCenter()
                    .Text($"EventPulse · {DateTimeOffset.UtcNow.ToString("d MMMM yyyy", Pl)}")
                    .FontSize(8.5f).LetterSpacing(0.12f).FontColor(p.Muted);
            });
        });

    // ───────────────────────────── building blocks ─────────────────────────────

    /// <summary>Page geometry and type shared by every page; the wash belongs to cover pages only.</summary>
    private static void Base(PageDescriptor page, ReportPalette p, bool washed)
    {
        page.Size(Deck);
        page.MarginHorizontal(64);
        page.MarginVertical(44);
        page.DefaultTextStyle(t => t.FontSize(10).FontColor(p.Ink).FontFamily(Fonts.Lato));

        // Content pages stay white. A tint under a chart shifts how its colours read, and under a
        // table it just looks like a printing fault.
        page.Background().Background(p.Paper).Element(e =>
        {
            if (washed)
            {
                e.Svg(ReportCharts.Wash(p.Primary, 0.24));
            }
        });
    }

    /// <summary>Full-bleed page with no running furniture — cover and closing.</summary>
    private static void Splash(PageDescriptor page, ReportPalette p) => Base(page, p, washed: true);

    /// <summary>
    /// A numbered content page. The section marker is pinned to the top and the footer to the
    /// bottom, which leaves the body free to sit optically centred instead of hanging off the top
    /// edge with half a page of nothing beneath it. It also means a table that runs onto a second
    /// page keeps its heading and numbering.
    /// </summary>
    private static void Shell(PageDescriptor page, ReportPalette p, string number, string label, string ev)
    {
        Base(page, p, washed: false);

        page.Header().PaddingBottom(24).Row(row =>
        {
            row.ConstantItem(22).AlignMiddle().LineHorizontal(1.2f).LineColor(p.Primary);
            row.AutoItem().PaddingLeft(10).Text($"{number} — {label}")
                .FontSize(7.5f).Bold().LetterSpacing(0.24f).FontColor(p.Primary);
        });

        page.Footer().PaddingTop(22).Column(col =>
        {
            col.Item().LineHorizontal(0.6f).LineColor(p.Hairline);
            col.Item().PaddingTop(8).Row(row =>
            {
                row.RelativeItem().Text(ev).FontSize(7.5f).LetterSpacing(0.1f).FontColor(p.Muted);
                row.AutoItem().Text(t =>
                {
                    t.DefaultTextStyle(s => s.FontSize(7.5f).FontColor(p.Muted));
                    t.CurrentPageNumber();
                });
            });
        });
    }

    private static void Title(ColumnDescriptor col, ReportPalette p, string text)
        => col.Item().Text(text).FontSize(30).Bold().LineHeight(1.1f).FontColor(p.Ink);

    private static void Subhead(IContainer container, ReportPalette p, string text)
        => container.PaddingBottom(10).Text(text).FontSize(13).Bold().FontColor(p.Ink);

    private static void Subhead(ColumnDescriptor col, ReportPalette p, string text)
        => col.Item().Element(e => Subhead(e, p, text));

    /// <summary>A headline figure with its caption — the report's main unit of information.</summary>
    private static void Big(RowDescriptor row, ReportPalette p, string value, string label, bool small = false)
        => row.RelativeItem().Column(c =>
        {
            c.Item().Text(value).FontSize(small ? 26 : 52).Bold().LineHeight(1f).FontColor(p.Primary);
            c.Item().PaddingTop(small ? 4 : 8).Text(label)
                .FontSize(small ? 8.5f : 10).FontColor(p.Muted);
        });

    private static void Meta(RowDescriptor row, ReportPalette p, string label, string value)
        => row.RelativeItem().Column(c =>
        {
            c.Item().Text(label).FontSize(7).Bold().LetterSpacing(0.2f).FontColor(p.Primary);
            c.Item().PaddingTop(6).Text(value).FontSize(10.5f).Bold().FontColor(p.Ink);
        });

    /// <summary>
    /// A labelled horizontal bar. The track is always full width so bars stay comparable by length
    /// alone; a value of zero still draws its row, because "nobody" is a result worth seeing.
    /// </summary>
    private static void Bar(
        ColumnDescriptor col,
        ReportPalette p,
        string label,
        int value,
        int max,
        string fill,
        bool compact = false,
        bool mutedValue = false,
        string? note = null)
        => col.Item().PaddingBottom(compact ? 8 : 14).Column(c =>
        {
            c.Item().Row(row =>
            {
                row.RelativeItem().Text(label)
                    .FontSize(compact ? 8.5f : 9.5f).FontColor(p.Ink);

                if (note is not null)
                {
                    row.AutoItem().PaddingRight(10).Text(note).FontSize(8).FontColor(p.Muted);
                }

                row.ConstantItem(46).AlignRight().Text(value.ToString(Pl))
                    .FontSize(compact ? 9 : 11).Bold()
                    .FontColor(mutedValue ? p.Muted : p.Primary);
            });

            c.Item().PaddingTop(compact ? 3 : 5).Height(compact ? 5 : 8)
                .Background(p.Wash).CornerRadius(4)
                .Row(track =>
                {
                    var share = max == 0 ? 0 : (float)value / max;
                    if (share > 0)
                    {
                        track.RelativeItem(share).Background(fill).CornerRadius(4);
                    }

                    // The remainder has to be claimed explicitly, otherwise the filled part
                    // stretches to the whole track and every bar looks identical.
                    if (share < 1)
                    {
                        track.RelativeItem(1 - share);
                    }
                });
        });

    private static void Head(TableDescriptor table, ReportPalette p, string text)
        => table.Cell().PaddingBottom(8).BorderBottom(1).BorderColor(p.Primary).PaddingBottom(6)
            .Text(text).FontSize(7).Bold().LetterSpacing(0.18f).FontColor(p.Primary);

    private static IContainer Cell(TableDescriptor table, ReportPalette p)
        => table.Cell().PaddingVertical(7).BorderBottom(0.6f).BorderColor(p.Hairline).PaddingRight(12);

    // ───────────────────────────── wording ─────────────────────────────

    private static string Headline(EventReportStatsDto stats) =>
        stats.CheckedIn == 0
            ? "Podsumowanie przygotowań, listy gości i programu wydarzenia."
            : $"{stats.CheckedIn.ToString(Pl)} gości na miejscu, {stats.TotalScans.ToString(Pl)} odbić kodów QR "
              + "i pełen zapis tego, jak przebiegł dzień.";

    private static string Window(EventDto ev, EventReportStatsDto stats)
    {
        var when = $"Wydarzenie trwało od {Time(ev.StartsAt)} do {Time(ev.EndsAt)}, "
                   + $"{Local(ev.StartsAt).ToString("d MMMM yyyy", Pl)}.";

        if (stats.FirstCheckIn is null)
        {
            return when + " Nie zarejestrowano odbić kodów QR.";
        }

        return when
               + $" Pierwszego gościa zameldowano o {Time(stats.FirstCheckIn)}, ostatniego o {Time(stats.LastCheckIn)}."
               + (stats.AverageMinutesOnSite is null
                   ? string.Empty
                   : $" Przeciętny gość spędził na miejscu {Duration(stats)}.");
    }

    private static string Duration(EventReportStatsDto stats)
    {
        if (stats.AverageMinutesOnSite is not { } minutes)
        {
            return "—";
        }

        var span = TimeSpan.FromMinutes(minutes);
        return span.TotalHours >= 1
            ? $"{(int)span.TotalHours} h {span.Minutes:00} min"
            : $"{span.Minutes} min";
    }

    private static string Spread(EventReportStatsDto stats)
    {
        if (stats.FirstCheckIn is null || stats.LastCheckIn is null)
        {
            return "—";
        }

        var span = stats.LastCheckIn.Value - stats.FirstCheckIn.Value;
        return span.TotalHours >= 1
            ? $"{(int)span.TotalHours} h {span.Minutes:00} min"
            : $"{span.Minutes} min";
    }

    /// <summary>Times are shown in the event's own timezone — UTC would be nonsense to a client.</summary>
    private static DateTimeOffset Local(DateTimeOffset value) => EventClock.ToEventLocal(value);

    private static string Time(DateTimeOffset? value) =>
        value is null ? "—" : Local(value.Value).ToString("HH:mm", Pl);

    private static string Dash(string? value) => string.IsNullOrWhiteSpace(value) ? "—" : value.Trim();
}
