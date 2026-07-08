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

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{mg.BaseUrl.TrimEnd('/')}/v3/{mg.Domain}/messages");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", auth);
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["from"] = $"{(string.IsNullOrWhiteSpace(message.FromName) ? _options.FromName : message.FromName)} <{_options.From}>",
            ["to"] = $"{message.ToName} <{message.ToEmail}>",
            ["subject"] = message.Subject,
            ["html"] = message.HtmlBody,
            ["text"] = message.TextBody ?? string.Empty,
        });

        var response = await _http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
