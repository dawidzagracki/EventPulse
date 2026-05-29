using EventPulse.Modules.Agenda.Application;
using EventPulse.Modules.Events.Application;
using EventPulse.Modules.Participants.Application.Feedback;
using EventPulse.Modules.Scanning.Application;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EventPulse.Api.Reports;

/// <summary>Renders the post-event PDF report (summary, attendance, agenda, feedback).</summary>
public static class EventReport
{
    public static byte[] Build(
        EventDto ev,
        DashboardDto dashboard,
        FeedbackSummaryDto feedback,
        IReadOnlyList<AgendaItemDto> agenda)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(40);
                page.Size(PageSizes.A4);
                page.DefaultTextStyle(t => t.FontSize(11));

                page.Header().Column(col =>
                {
                    col.Item().Text("EventPulse — raport wydarzenia").FontSize(18).Bold();
                    col.Item().Text(ev.Name).FontSize(14).FontColor(Colors.Indigo.Medium);
                    col.Item().Text($"{ev.StartsAt:g} – {ev.EndsAt:g}  ·  {ev.Location}").FontColor(Colors.Grey.Medium);
                });

                page.Content().PaddingVertical(15).Column(col =>
                {
                    col.Spacing(14);

                    col.Item().Text("Frekwencja").FontSize(14).Bold();
                    col.Item().Row(row =>
                    {
                        Stat(row, "Zaproszeni", dashboard.Total);
                        Stat(row, "Obecni", dashboard.CheckedIn);
                        Stat(row, "Frekwencja", $"{dashboard.AttendancePct}%");
                        Stat(row, "Nieobecni", dashboard.NoShow);
                    });

                    col.Item().PaddingTop(6).Text("Agenda").FontSize(14).Bold();
                    if (agenda.Count == 0)
                    {
                        col.Item().Text("Brak punktów agendy.").FontColor(Colors.Grey.Medium);
                    }
                    else
                    {
                        foreach (var item in agenda)
                        {
                            col.Item().Text($"• {item.StartsAt:t} — {item.TitlePl}");
                        }
                    }

                    col.Item().PaddingTop(6).Text("Feedback").FontSize(14).Bold();
                    col.Item().Text($"Średnia ocena: {feedback.Average} / 5  ({feedback.Count} odpowiedzi)");
                    foreach (var f in feedback.Items.Where(i => !string.IsNullOrWhiteSpace(i.Comment)).Take(20))
                    {
                        col.Item().Text($"★{f.Rating} — {f.Comment}").FontColor(Colors.Grey.Darken1);
                    }
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("EventPulse · ");
                    x.Span($"{DateTimeOffset.UtcNow:yyyy-MM-dd}");
                });
            });
        }).GeneratePdf();
    }

    private static void Stat(RowDescriptor row, string label, object value) =>
        row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(c =>
        {
            c.Item().Text(value.ToString()!).FontSize(18).Bold().FontColor(Colors.Indigo.Medium);
            c.Item().Text(label).FontSize(9).FontColor(Colors.Grey.Medium);
        });
}
