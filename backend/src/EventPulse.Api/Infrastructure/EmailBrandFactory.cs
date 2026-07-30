using EventPulse.Modules.Events.Application;
using EventPulse.Shared.Notifications;
using Microsoft.Extensions.Configuration;

namespace EventPulse.Api.Infrastructure;

/// <summary>
/// Per-event transactional e-mail settings, shared by the controllers that send guest mail.
/// (ParticipantsController still has its own private copies — deliberately left alone while it is
/// on the event-day QR critical path; deduplicate once the event is over.)
/// </summary>
public static class EmailBrandFactory
{
    /// <summary>The event's accent colour + logo + header/sender/subject overrides for outgoing mail.</summary>
    public static EmailBrand For(EventDto ev) => new(
        ev.EmailBranding.AccentColor,
        ev.EmailBranding.LogoUrl,
        ev.Name,
        ev.EmailBranding.HeaderName,
        ev.EmailBranding.FromName,
        ev.EmailBranding.Subject);

    /// <summary>Base URL a participant magic link is built on, e.g. https://eventpulse.pl/p.</summary>
    public static string ParticipantLinkBaseUrl(IConfiguration configuration)
        => configuration["App:ParticipantLinkBaseUrl"] ?? "http://localhost:5173/p";
}
