using System.Net;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;

namespace EventPulse.Modules.Participants.Application.Invitations;

/// <summary>
/// A message the organiser typed themselves — "the coach is waiting", "dinner moved by 30 minutes".
/// Every other mail in the system has fixed copy; this is the only one carrying free text, which is
/// why the encoding below matters so much.
/// </summary>
public static class CustomMessageEmail
{
    public static EmailMessage Build(
        Participant participant,
        string subjectPl,
        string bodyPl,
        string? subjectEn,
        string? bodyEn,
        string link,
        EmailBrand? brand = null)
    {
        // English only when there is an English text to show; otherwise the guest gets the Polish
        // one rather than an empty mail.
        var useEn = participant.Language.Equals("en", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(bodyEn);

        var subject = useEn && !string.IsNullOrWhiteSpace(subjectEn) ? subjectEn!.Trim() : subjectPl.Trim();
        var body = useEn ? bodyEn!.Trim() : bodyPl.Trim();
        var name = WebUtility.HtmlEncode(participant.FirstName);

        var content = new EmailContent
        {
            Preheader = subject,
            Heading = useEn ? $"Hello {name}," : $"Cześć {name},",
            Paragraphs = [ToHtmlParagraph(body)],
            CtaLabel = useEn ? "Open event page" : "Otwórz stronę wydarzenia",
            CtaUrl = link,
            FallbackNote = useEn
                ? "If the button doesn't work, copy this link:"
                : "Jeśli przycisk nie działa, skopiuj ten link:",
            FooterNote = useEn
                ? "You're receiving this because you're a guest at this event."
                : "Otrzymujesz tę wiadomość, ponieważ jesteś gościem tego wydarzenia.",
        };

        return new EmailMessage(
            participant.Email!,
            $"{participant.FirstName} {participant.LastName}",
            subject,
            EmailLayout.Render(content, brand),
            body,
            brand?.FromName);
    }

    /// <summary>
    /// Turns typed text into a body paragraph. <see cref="EmailContent.Paragraphs"/> is rendered as
    /// TRUSTED HTML — every other builder puts hand-written markup there — so free text has to be
    /// encoded first, or a stray "&lt;" silently swallows the rest of the message. Line breaks are
    /// converted only AFTER encoding, so the &lt;br /&gt; survives while the author's text cannot
    /// introduce any markup of its own.
    /// </summary>
    private static string ToHtmlParagraph(string text) =>
        WebUtility.HtmlEncode(text).Replace("\r\n", "\n").Replace("\n", "<br />");
}
