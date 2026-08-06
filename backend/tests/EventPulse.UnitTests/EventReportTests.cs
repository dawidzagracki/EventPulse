using EventPulse.Api.Reports;
using EventPulse.Modules.Agenda.Application;
using EventPulse.Modules.Agenda.Domain;
using EventPulse.Modules.Content.Application;
using EventPulse.Modules.Events.Application;
using EventPulse.Modules.Events.Domain;
using EventPulse.Modules.Participants.Application.Feedback;
using EventPulse.Modules.Scanning.Application;

namespace EventPulse.UnitTests;

/// <summary>
/// QuestPDF resolves layout at render time, so an overflowing cell or an unbounded element throws
/// only when the document is actually generated — never at compile time. These render the real
/// report and are the only place that failure can be caught before a client asks for their PDF.
/// </summary>
public class EventReportTests
{
    static EventReportTests()
    {
        // Program.cs sets this for the running API; a unit test never goes through Program.
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
    }

    private static readonly DateTimeOffset Start = new(2026, 7, 30, 12, 30, 0, TimeSpan.Zero);

    private static EventDto Event() => EventDto.From(new Event
    {
        Name = "Kermi Grand Opening",
        Slug = "kermi-grand-opening",
        StartsAt = Start,
        EndsAt = Start.AddHours(7.5),
        Location = "wyspa Słodowa 7, Wrocław",
    });

    private static BrandingDto Branding(string primary = "#84cc16") =>
        new(primary, "#0ea5e9", "#e2e8f0", "Inter", null, null, null);

    private static EventReportStatsDto Stats(int checkedIn = 47, int arrivals = 9) => new(
        Guests: 59,
        Companions: 4,
        Confirmed: 52,
        Declined: 3,
        CheckedIn: checkedIn,
        CheckedOut: 41,
        NoShow: 12,
        AttendancePct: 79.7,
        OnboardingCompleted: 44,
        PhotoConsents: 38,
        FirstCheckIn: Start.AddMinutes(-20),
        LastCheckIn: Start.AddHours(2),
        PeakArrivals: 14,
        PeakAt: Start.AddMinutes(15),
        AverageMinutesOnSite: 268,
        TotalScans: 132,
        Arrivals: Enumerable.Range(0, arrivals)
            .Select(i => new ReportBucket(Start.AddMinutes(15 * i), (i * 5 % 14) + 1))
            .ToList(),
        Companies: [new("Klima-Therm", 9), new("Kermi Polska", 7), new("SPIUG", 4), new("Instalbud", 2)],
        Groups: [new("Autokar A", 24), new("Dojazd własny", 18)],
        Dietary: [new("Wegetariańska", 6), new("Bezglutenowa", 2)],
        Checkpoints:
        [
            new("Autokar z hotelu do Kermi", 38, 41, Start.AddMinutes(-45), Start.AddMinutes(-10)),
            new("Zwiedzanie fabryki", 31, 33, Start.AddHours(1), Start.AddHours(2)),
        ]);

    private static DashboardDto Dashboard() => new(59, 7, 52, 47, 41, 12, 79.7, [], []);

    private static FeedbackSummaryDto Feedback(int count = 18) => new(
        count,
        4.6,
        Enumerable.Range(0, count)
            .Select(i => new FeedbackItem(
                5 - (i % 3),
                i % 2 == 0 ? "Świetna organizacja, wszystko dopięte na ostatni guzik — zwłaszcza wejście." : null,
                Start.AddHours(6)))
            .ToList());

    private static IReadOnlyList<AgendaItemDto> Agenda() =>
    [
        Item("Zbiórka i przejazd autokarem", Start.AddMinutes(-60), Start, "Hotel Concordia", requiresCheckIn: true),
        Item("Powitanie gości", Start, Start.AddMinutes(30), "Hala główna", speaker: "Jarosław Wojtal"),
        Item("Zwiedzanie fabryki", Start.AddMinutes(30), Start.AddHours(2), "Linia produkcyjna", requiresCheckIn: true),
        Item("Kolacja", Start.AddHours(4), Start.AddHours(6), "Restauracja"),
    ];

    private static AgendaItemDto Item(
        string title, DateTimeOffset from, DateTimeOffset to,
        string? location = null, string? speaker = null, bool requiresCheckIn = false) =>
        new(Guid.NewGuid(), Guid.NewGuid(), from, to, title, title, null, null,
            AgendaItemType.Other, location, null, speaker, null, null, null,
            requiresCheckIn, null, null, null, null, null, null, null);

    private static byte[] Build(
        EventReportStatsDto? stats = null,
        FeedbackSummaryDto? feedback = null,
        IReadOnlyList<AgendaItemDto>? agenda = null,
        BrandingDto? branding = null) =>
        EventReport.Build(
            Event(), branding ?? Branding(), Dashboard(),
            stats ?? Stats(), feedback ?? Feedback(), agenda ?? Agenda());

    [Fact]
    public void Renders_a_pdf_for_a_full_event()
    {
        var pdf = Build();

        Assert.True(pdf.Length > 5000, $"Suspiciously small PDF: {pdf.Length} B");
        Assert.Equal("%PDF"u8.ToArray(), pdf.Take(4).ToArray());
    }

    [Fact]
    public void Renders_when_the_event_produced_no_data_at_all()
    {
        // A cancelled or unscanned event still has to yield a report rather than an exception:
        // every section is optional, and the ones that remain must not divide by zero.
        var empty = new EventReportStatsDto(
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null, null, 0, null, null, 0, [], [], [], [], []);

        var pdf = EventReport.Build(
            Event(), Branding(), new DashboardDto(0, 0, 0, 0, 0, 0, 0, [], []),
            empty, new FeedbackSummaryDto(0, 0, []), []);

        Assert.Equal("%PDF"u8.ToArray(), pdf.Take(4).ToArray());
    }

    [Fact]
    public void Survives_a_colour_the_page_builder_should_never_have_stored()
    {
        // Branding is user input all the way down. A malformed hex must fall back, never throw —
        // losing the client's colour is a blemish, losing their report is a failure.
        foreach (var colour in new[] { "not-a-colour", "", "#12", "#zzzzzz", "abc" })
        {
            var pdf = Build(branding: Branding(colour));
            Assert.Equal("%PDF"u8.ToArray(), pdf.Take(4).ToArray());
        }
    }

    [Fact]
    public void Handles_a_full_house_and_a_long_guest_list()
    {
        // 100% attendance is the arc-drawing edge case (a full circle has no start-to-end sweep),
        // and a long arrival curve must not push the chart off the page.
        var stats = Stats(checkedIn: 59, arrivals: 40) with { AttendancePct = 100 };

        Assert.Equal("%PDF"u8.ToArray(), Build(stats).Take(4).ToArray());
    }

    [Fact]
    public void Writes_a_sample_to_disk_when_asked()
    {
        var dir = Environment.GetEnvironmentVariable("EP_REPORT_DUMP");
        if (string.IsNullOrWhiteSpace(dir))
        {
            return;
        }

        Directory.CreateDirectory(dir);
        File.WriteAllBytes(Path.Combine(dir, "raport.pdf"), Build());
    }
}
