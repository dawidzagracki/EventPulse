using System.Net;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;

namespace EventPulse.Modules.Participants.Application.Invitations;

/// <summary>Builds the bilingual invitation email containing the participant's personal access link.</summary>
public static class InvitationEmail
{
    public static EmailMessage Build(Participant participant, string eventName, string link)
    {
        var isEn = participant.Language.Equals("en", StringComparison.OrdinalIgnoreCase);
        var name = WebUtility.HtmlEncode(participant.FirstName);
        var ev = WebUtility.HtmlEncode(eventName);

        var subject = isEn ? $"Your invitation: {eventName}" : $"Twoje zaproszenie: {eventName}";

        var (greeting, intro, cta, footer) = isEn
            ? ($"Hello {name},",
               $"You have been invited to <strong>{ev}</strong>.",
               "Open my event page",
               "If the button doesn't work, copy this link into your browser:")
            : ($"Cześć {name},",
               $"Zostałeś zaproszony(a) na wydarzenie <strong>{ev}</strong>.",
               "Otwórz stronę wydarzenia",
               "Jeśli przycisk nie działa, skopiuj ten link do przeglądarki:");

        var html = $"""
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
              <p>{greeting}</p>
              <p>{intro}</p>
              <p style="margin:24px 0">
                <a href="{link}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">{cta}</a>
              </p>
              <p style="color:#666;font-size:12px">{footer}<br><a href="{link}">{link}</a></p>
            </div>
            """;

        var text = $"{(isEn ? "Hello" : "Cześć")} {participant.FirstName},\n{(isEn ? "Your event link" : "Twój link do wydarzenia")}: {link}";

        return new EmailMessage(participant.Email, $"{participant.FirstName} {participant.LastName}", subject, html, text);
    }
}
