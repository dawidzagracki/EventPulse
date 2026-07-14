using System.Net;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;
using EventPulse.Shared.Time;

namespace EventPulse.Modules.Participants.Application.Invitations;

/// <summary>
/// Builds the invitation email with the participant's personal access link, always in BOTH
/// languages (Polish + English) so it's clear regardless of the guest's language setting.
/// </summary>
public static class InvitationEmail
{
    public static EmailMessage Build(Participant participant, string eventName, DateTimeOffset startsAt, string link, EmailBrand? brand = null)
    {
        var name = WebUtility.HtmlEncode(participant.FirstName);
        var ev = WebUtility.HtmlEncode(eventName);
        // Render in the event's local time (Europe/Warsaw), not the raw UTC we read from Postgres,
        // otherwise the e-mail shows a time offset by 1–2h from the real event start.
        var local = EventClock.ToEventLocal(startsAt);
        var datePl = local.ToString("dddd, d MMMM yyyy, HH:mm", new System.Globalization.CultureInfo("pl-PL"));
        var dateEn = local.ToString("dddd, d MMMM yyyy, HH:mm", new System.Globalization.CultureInfo("en-GB"));

        var defaultSubject = $"Twoje zaproszenie / Your invitation: {eventName}";
        var subject = brand?.ResolvedSubject(defaultSubject) ?? defaultSubject;

        var content = new EmailContent
        {
            Preheader = $"Zaproszenie na {eventName} · You're invited",
            Heading = $"Cześć {name}, / Hello {name},",
            Paragraphs =
            [
                $"Zostałeś(-aś) zaproszony(-a) na wydarzenie <strong>{ev}</strong>. Otwórz swoją osobistą stronę wydarzenia poniżej — znajdziesz tam agendę, swój kod QR i wszystkie szczegóły w jednym miejscu.",
                Divider,
                $"<em style=\"color:#6b7280;\">English:</em> You have been invited to <strong>{ev}</strong>. Open your personal event page below — you'll find the agenda, your QR code and everything you need in one place.",
            ],
            InfoRows =
            [
                new EmailInfoRow("Kiedy", datePl),
                new EmailInfoRow("When", dateEn),
            ],
            CtaLabel = "Otwórz stronę wydarzenia / Open event page",
            CtaUrl = link,
            FallbackNote = "Jeśli przycisk nie działa, skopiuj ten link / If the button doesn't work, copy this link:",
            FooterNote = "Otrzymujesz tę wiadomość, ponieważ zaproszono Cię na wydarzenie. / You're receiving this because you were invited to an event.",
        };

        var html = EmailLayout.Render(content, brand);

        var text =
            $"Cześć {participant.FirstName}, / Hello {participant.FirstName},\n"
            + $"{eventName} — {datePl} / {dateEn}\n"
            + $"Twój link / Your link: {link}";

        return new EmailMessage(participant.Email, $"{participant.FirstName} {participant.LastName}", subject, html, text, brand?.FromName);
    }

    /// <summary>A thin horizontal rule used as a trusted-HTML paragraph between the PL and EN blocks.</summary>
    internal const string Divider = "<span style=\"display:block;height:1px;background:#e5e7eb;margin:2px 0;\"></span>";
}
