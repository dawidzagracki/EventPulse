using System.Net;
using EventPulse.Modules.Participants.Application.Qr;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;
using EventPulse.Shared.Time;

namespace EventPulse.Modules.Participants.Application.Invitations;

/// <summary>
/// Builds the entry e-mail for a guest who only needs to get in — the QR code is rendered inside
/// the message (and attached as a PNG), so they never have to open the app. Bilingual PL+EN like
/// <see cref="InvitationEmail"/>, but deliberately without a "open the event page" call to action.
/// </summary>
public static class EntryQrEmail
{
    // The inline image is referenced as cid:{InlineName}. Keeping the content-id equal to the file
    // name makes it work on both senders: MailKit matches on content-id, Mailgun on the file name.
    private const string InlineName = "qr.png";

    public static EmailMessage Build(
        Participant participant,
        string eventName,
        DateTimeOffset startsAt,
        string? location,
        string link,
        EmailBrand? brand = null)
    {
        var name = WebUtility.HtmlEncode(participant.FirstName);
        var ev = WebUtility.HtmlEncode(eventName);
        // Render in the event's local time (Europe/Warsaw), not the raw UTC we read from Postgres.
        var local = EventClock.ToEventLocal(startsAt);
        var datePl = local.ToString("dddd, d MMMM yyyy, HH:mm", new System.Globalization.CultureInfo("pl-PL"));
        var dateEn = local.ToString("dddd, d MMMM yyyy, HH:mm", new System.Globalization.CultureInfo("en-GB"));

        // Deliberately NOT brand.ResolvedSubject: the event's custom subject is written for the
        // invitation, so applying it here gave both mails the same title and the guest could not
        // tell them apart in a full inbox. A fixed "Twój kod QR" prefix is what makes this one
        // findable at the door; the event name keeps it unambiguous across events. The visual
        // branding is untouched — colour, logo and sender name do not depend on the subject.
        var subject = $"Twój kod QR / Your QR code: {eventName}";

        var infoRows = new List<EmailInfoRow>
        {
            new("Kiedy", datePl),
            new("When", dateEn),
        };
        if (!string.IsNullOrWhiteSpace(location))
        {
            infoRows.Add(new EmailInfoRow("Miejsce / Where", location.Trim()));
        }

        var content = new EmailContent
        {
            Preheader = $"Twój kod QR na {eventName} · Your entry QR code",
            Heading = $"Cześć {name}, / Hello {name},",
            Paragraphs =
            [
                $"Poniżej znajduje się Twój osobisty kod QR na wydarzenie <strong>{ev}</strong>. "
                + "<strong>Pokaż go przy wejściu</strong> — obsługa zeskanuje kod i wpuści Cię na miejsce. "
                + "Ten sam kod służy też przy wyjściu.",
                InvitationEmail.Divider,
                $"<em style=\"color:#6b7280;\">English:</em> Below is your personal QR code for <strong>{ev}</strong>. "
                + "<strong>Show it at the entrance</strong> — our staff will scan it and let you in. "
                + "Use the same code when you leave.",
            ],
            InfoRows = infoRows,
            RawHtml = QrBlock(),
            FooterNote = "Kod jest przypisany do Ciebie — nie przekazuj go dalej. / This code is personal to you — please don't share it.",
        };

        var html = EmailLayout.Render(content, brand);

        var text =
            $"Cześć {participant.FirstName}, / Hello {participant.FirstName},\n"
            + $"{eventName} — {datePl} / {dateEn}\n"
            + "Twój kod QR jest w załączniku (kod-qr.png). Pokaż go przy wejściu.\n"
            + "Your QR code is attached (kod-qr.png). Show it at the entrance.\n"
            + $"Kod / Code: {participant.AccessToken}";

        var png = QrImage.GeneratePng(link);
        var attachments = new List<EmailAttachment>
        {
            // Shown in the body…
            new(InlineName, "image/png", png, InlineName),
            // …and downloadable, so the guest can keep it on their phone for the door.
            new("kod-qr.png", "image/png", png),
        };

        return new EmailMessage(
            participant.Email!,
            $"{participant.FirstName} {participant.LastName}",
            subject,
            html,
            text,
            brand?.FromName,
            attachments);
    }

    /// <summary>The QR code on a white card — table layout so Outlook and Gmail both centre it.</summary>
    private static string QrBlock() =>
        """
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 8px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;">
                <tr>
                  <td align="center" style="padding:18px 18px 10px;">
                    <img src="cid:qr.png" alt="Kod QR / QR code" width="240" height="240"
                         style="display:block;width:240px;height:240px;border:0;outline:none;text-decoration:none;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 18px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">
                    Pokaż ten kod przy wejściu<br />Show this code at the entrance
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        """;
}
