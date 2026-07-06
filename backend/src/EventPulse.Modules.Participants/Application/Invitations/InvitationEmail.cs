using System.Net;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;

namespace EventPulse.Modules.Participants.Application.Invitations;

/// <summary>Builds the bilingual invitation email containing the participant's personal access link.</summary>
public static class InvitationEmail
{
    public static EmailMessage Build(Participant participant, string eventName, DateTimeOffset startsAt, string link, EmailBrand? brand = null)
    {
        var isEn = participant.Language.Equals("en", StringComparison.OrdinalIgnoreCase);
        var culture = isEn ? "en-GB" : "pl-PL";
        var name = WebUtility.HtmlEncode(participant.FirstName);
        var ev = WebUtility.HtmlEncode(eventName);
        var dateText = startsAt.ToString("dddd, d MMMM yyyy, HH:mm", new System.Globalization.CultureInfo(culture));

        var subject = isEn ? $"Your invitation: {eventName}" : $"Twoje zaproszenie: {eventName}";

        var content = isEn
            ? new EmailContent
            {
                Preheader = $"You're invited to {eventName}",
                Heading = $"Hello {name},",
                Paragraphs =
                [
                    $"You have been invited to <strong>{ev}</strong>.",
                    "Open your personal event page below — you'll find the agenda, your QR code and everything you need in one place.",
                ],
                InfoRows = [new EmailInfoRow("When", dateText)],
                CtaLabel = "Open my event page",
                CtaUrl = link,
                FallbackNote = "If the button doesn't work, copy this link into your browser:",
                FooterNote = "You're receiving this because you were invited to an event managed with EventPulse.",
            }
            : new EmailContent
            {
                Preheader = $"Zaproszenie na {eventName}",
                Heading = $"Cześć {name},",
                Paragraphs =
                [
                    $"Zostałeś(-aś) zaproszony(-a) na wydarzenie <strong>{ev}</strong>.",
                    "Otwórz swoją osobistą stronę wydarzenia poniżej — znajdziesz tam agendę, swój kod QR i wszystkie szczegóły w jednym miejscu.",
                ],
                InfoRows = [new EmailInfoRow("Kiedy", dateText)],
                CtaLabel = "Otwórz stronę wydarzenia",
                CtaUrl = link,
                FallbackNote = "Jeśli przycisk nie działa, skopiuj ten link do przeglądarki:",
                FooterNote = "Otrzymujesz tę wiadomość, ponieważ zaproszono Cię na wydarzenie obsługiwane w EventPulse.",
            };

        var html = EmailLayout.Render(content, brand);

        var text = $"{(isEn ? "Hello" : "Cześć")} {participant.FirstName},\n{eventName} — {dateText}\n{(isEn ? "Your event link" : "Twój link do wydarzenia")}: {link}";

        return new EmailMessage(participant.Email, $"{participant.FirstName} {participant.LastName}", subject, html, text);
    }
}
