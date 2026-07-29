using EventPulse.Shared.Notifications;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace EventPulse.Infrastructure.Email;

/// <summary>SMTP sender (MailKit). Locally targets Mailhog, which accepts mail without auth/TLS.</summary>
public sealed class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;

    public SmtpEmailSender(IOptions<EmailOptions> options) => _options = options.Value;

    /// <summary>
    /// Builds the MIME message. Separate from sending so the structure that decides whether an
    /// inline image actually renders (multipart/related + Content-ID) can be asserted in tests
    /// without talking to an SMTP server.
    /// </summary>
    public static MimeMessage BuildMime(EmailMessage message, EmailOptions options)
    {
        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(
            string.IsNullOrWhiteSpace(message.FromName) ? options.FromName : message.FromName, options.From));
        mime.To.Add(new MailboxAddress(message.ToName, message.ToEmail));
        mime.Subject = message.Subject;
        var body = new BodyBuilder
        {
            HtmlBody = message.HtmlBody,
            TextBody = message.TextBody,
        };

        foreach (var attachment in message.Attachments ?? [])
        {
            var contentType = ContentType.Parse(attachment.ContentType);
            if (attachment.ContentId is null)
            {
                body.Attachments.Add(attachment.FileName, attachment.Content, contentType);
                continue;
            }

            // Inline: the HTML references it as cid:{ContentId}, so the image renders in the body.
            var inline = body.LinkedResources.Add(attachment.FileName, attachment.Content, contentType);
            inline.ContentId = attachment.ContentId;
        }

        mime.Body = body.ToMessageBody();
        return mime;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        var mime = BuildMime(message, _options);

        using var client = new SmtpClient();
        var security = _options.Smtp.UseSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None;
        await client.ConnectAsync(_options.Smtp.Host, _options.Smtp.Port, security, cancellationToken);

        if (!string.IsNullOrEmpty(_options.Smtp.User))
        {
            await client.AuthenticateAsync(_options.Smtp.User, _options.Smtp.Password ?? string.Empty, cancellationToken);
        }

        await client.SendAsync(mime, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }
}
