using System.Net.Http.Headers;
using System.Text;
using EventPulse.Shared.Notifications;
using Microsoft.Extensions.Options;

namespace EventPulse.Infrastructure.Email;

/// <summary>Mailgun HTTP API sender for staging/production.</summary>
public sealed class MailgunEmailSender : IEmailSender
{
    private readonly HttpClient _http;
    private readonly EmailOptions _options;

    public MailgunEmailSender(HttpClient http, IOptions<EmailOptions> options)
    {
        _http = http;
        _options = options.Value;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        var mg = _options.Mailgun;
        var auth = Convert.ToBase64String(Encoding.ASCII.GetBytes($"api:{mg.ApiKey}"));

        var fields = new Dictionary<string, string>
        {
            ["from"] = $"{(string.IsNullOrWhiteSpace(message.FromName) ? _options.FromName : message.FromName)} <{_options.From}>",
            ["to"] = $"{message.ToName} <{message.ToEmail}>",
            ["subject"] = message.Subject,
            ["html"] = message.HtmlBody,
            ["text"] = message.TextBody ?? string.Empty,
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{mg.BaseUrl.TrimEnd('/')}/v3/{mg.Domain}/messages");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", auth);

        // Form-encoded content cannot carry binary parts, so switch to multipart only when needed.
        if (message.Attachments is { Count: > 0 })
        {
            var multipart = new MultipartFormDataContent();
            foreach (var (key, value) in fields)
            {
                multipart.Add(new StringContent(value, Encoding.UTF8), key);
            }

            foreach (var attachment in message.Attachments)
            {
                var part = new ByteArrayContent(attachment.Content);
                part.Headers.ContentType = new MediaTypeHeaderValue(attachment.ContentType);
                // Mailgun distinguishes embedded images ("inline", referenced as cid:{filename})
                // from ordinary downloads ("attachment").
                multipart.Add(part, attachment.ContentId is null ? "attachment" : "inline", attachment.FileName);
            }

            request.Content = multipart;
        }
        else
        {
            request.Content = new FormUrlEncodedContent(fields);
        }

        using var response = await _http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
