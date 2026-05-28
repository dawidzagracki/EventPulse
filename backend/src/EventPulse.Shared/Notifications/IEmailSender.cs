namespace EventPulse.Shared.Notifications;

public sealed record EmailMessage(
    string ToEmail,
    string ToName,
    string Subject,
    string HtmlBody,
    string? TextBody = null);

/// <summary>Sends transactional email. Local: SMTP→Mailhog. Prod: Mailgun. Selected by config.</summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}
