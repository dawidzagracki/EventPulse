namespace EventPulse.Infrastructure.Email;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>"Smtp" (local/Mailhog) or "Mailgun" (staging/prod).</summary>
    public string Provider { get; set; } = "Smtp";

    public string From { get; set; } = "events@eventpulse.local";
    public string FromName { get; set; } = "EventPulse";

    public SmtpOptions Smtp { get; set; } = new();
    public MailgunOptions Mailgun { get; set; } = new();
}

public sealed class SmtpOptions
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 1025;
    public bool UseSsl { get; set; }
    public string? User { get; set; }
    public string? Password { get; set; }
}

public sealed class MailgunOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.mailgun.net";
}
