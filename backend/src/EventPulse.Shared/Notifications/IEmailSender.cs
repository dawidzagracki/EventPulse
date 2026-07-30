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

/// <summary>How a batch send went, counted per message.</summary>
public sealed record EmailBatchResult(int Sent, int Failed);

/// <summary>Sends transactional email. Local: SMTP→Mailhog. Prod: Mailgun. Selected by config.</summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sends a whole run of messages. Exists because SMTP pays for a connection and an
    /// authentication handshake per message: a guest list of 59 receiving two mails each means 118
    /// handshakes back to back inside one request. A sender that can hold the connection open
    /// overrides this; the default simply loops, which is right for HTTP-based providers.
    /// One bad address never stops the rest — failures are counted, not thrown.
    /// </summary>
    async Task<EmailBatchResult> SendManyAsync(
        IReadOnlyList<EmailMessage> messages,
        CancellationToken cancellationToken = default)
    {
        var sent = 0;
        var failed = 0;
        foreach (var message in messages)
        {
            try
            {
                await SendAsync(message, cancellationToken);
                sent++;
            }
            catch
            {
                failed++;
            }
        }

        return new EmailBatchResult(sent, failed);
    }
}
