namespace EventPulse.Shared.Notifications;

/// <summary>
/// A file carried by an e-mail. When <see cref="ContentId"/> is set the file is embedded in the
/// message body (referenced as <c>&lt;img src="cid:{ContentId}"&gt;</c>) instead of being listed as a
/// download — that's how the entry QR code is rendered inside the mail itself. Attaching the same
/// bytes twice (once inline, once with a null ContentId) gives the guest both: a code they see
/// immediately and a PNG they can save to their phone for use at the door without network.
/// </summary>
public sealed record EmailAttachment(
    string FileName,
    string ContentType,
    byte[] Content,
    string? ContentId = null);

public sealed record EmailMessage(
    string ToEmail,
    string ToName,
    string Subject,
    string HtmlBody,
    string? TextBody = null,
    // Optional per-message sender display name; the from-address stays the configured default.
    string? FromName = null,
    // Inline images and/or downloadable files; null or empty keeps the plain body-only behaviour.
    IReadOnlyList<EmailAttachment>? Attachments = null);

/// <summary>Sends transactional email. Local: SMTP→Mailhog. Prod: Mailgun. Selected by config.</summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}
