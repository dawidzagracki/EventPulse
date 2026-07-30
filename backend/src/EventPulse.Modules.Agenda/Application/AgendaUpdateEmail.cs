using System.Globalization;
using System.Net;
using System.Text;
using EventPulse.Modules.Agenda.Domain;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;
using EventPulse.Shared.Time;

namespace EventPulse.Modules.Agenda.Application;

/// <summary>
/// The "agenda was updated" e-mail an organiser sends on demand. It carries the CURRENT agenda in
/// full, so a guest learns what is now true without opening anything — the old automatic mail only
/// said that one item had changed, and gave no link at all.
/// </summary>
public static class AgendaUpdateEmail
{
    public static EmailMessage Build(
        Participant participant,
        string eventName,
        IReadOnlyList<AgendaItem> items,
        string link,
        EmailBrand? brand = null)
    {
        var isEn = participant.Language.Equals("en", StringComparison.OrdinalIgnoreCase);
        var name = WebUtility.HtmlEncode(participant.FirstName);
        var ev = WebUtility.HtmlEncode(eventName);

        var defaultSubject = isEn ? $"Agenda update: {eventName}" : $"Zmiana w agendzie: {eventName}";
        var subject = brand?.ResolvedSubject(defaultSubject) ?? defaultSubject;

        var content = new EmailContent
        {
            Preheader = isEn ? $"Updated agenda: {eventName}" : $"Aktualna agenda: {eventName}",
            Heading = isEn ? $"Hello {name}," : $"Cześć {name},",
            Paragraphs =
            [
                isEn
                    ? $"The agenda of <strong>{ev}</strong> has been updated. Here is the current plan:"
                    : $"Agenda wydarzenia <strong>{ev}</strong> została zaktualizowana. Poniżej aktualny plan:",
            ],
            RawHtml = AgendaTable(items, isEn),
            CtaLabel = isEn ? "Open event page" : "Otwórz stronę wydarzenia",
            CtaUrl = link,
            FallbackNote = isEn
                ? "If the button doesn't work, copy this link:"
                : "Jeśli przycisk nie działa, skopiuj ten link:",
            FooterNote = isEn
                ? "You're receiving this because you're a guest at this event."
                : "Otrzymujesz tę wiadomość, ponieważ jesteś gościem tego wydarzenia.",
        };

        var html = EmailLayout.Render(content, brand);
        return new EmailMessage(
            participant.Email!,
            $"{participant.FirstName} {participant.LastName}",
            subject,
            html,
            TextBody(items, isEn, eventName, link),
            brand?.FromName);
    }

    /// <summary>
    /// The agenda as a table — day heading, then time + title per row. Rendered in the event's local
    /// time (Europe/Warsaw) like every other mail, otherwise the hours are off by the UTC offset.
    /// </summary>
    private static string AgendaTable(IReadOnlyList<AgendaItem> items, bool isEn)
    {
        var culture = new CultureInfo(isEn ? "en-GB" : "pl-PL");
        var sb = new StringBuilder();
        sb.Append("""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 6px;font-family:Arial,Helvetica,sans-serif;">""");

        string? currentDay = null;
        foreach (var item in items)
        {
            var local = EventClock.ToEventLocal(item.StartsAt);
            var day = local.ToString("dddd, d MMMM yyyy", culture);
            if (day != currentDay)
            {
                currentDay = day;
                sb.Append(
                    $"""<tr><td colspan="2" style="padding:14px 0 6px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;color:#9aa1af;">{WebUtility.HtmlEncode(day)}</td></tr>""");
            }

            var time = local.ToString("HH:mm", culture);
            var title = WebUtility.HtmlEncode(isEn ? item.TitleEn : item.TitlePl);
            sb.Append(
                $"""
                <tr>
                  <td width="64" valign="top" style="padding:6px 10px 6px 0;font-size:15px;font-weight:bold;color:#111827;white-space:nowrap;">{time}</td>
                  <td valign="top" style="padding:6px 0;font-size:15px;line-height:1.5;color:#374151;border-bottom:1px solid #eef0f4;">{title}</td>
                </tr>
                """);
        }

        sb.Append("</table>");
        return sb.ToString();
    }

    private static string TextBody(IReadOnlyList<AgendaItem> items, bool isEn, string eventName, string link)
    {
        var culture = new CultureInfo(isEn ? "en-GB" : "pl-PL");
        var sb = new StringBuilder();
        sb.AppendLine(isEn ? $"Agenda update: {eventName}" : $"Zmiana w agendzie: {eventName}");
        sb.AppendLine();
        foreach (var item in items)
        {
            var local = EventClock.ToEventLocal(item.StartsAt);
            sb.AppendLine($"{local.ToString("dd.MM HH:mm", culture)}  {(isEn ? item.TitleEn : item.TitlePl)}");
        }

        sb.AppendLine();
        sb.AppendLine(isEn ? $"Your event page: {link}" : $"Twoja strona wydarzenia: {link}");
        return sb.ToString();
    }
}
