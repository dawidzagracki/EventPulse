namespace EventPulse.Shared.Notifications;

/// <summary>
/// Per-event branding applied to a transactional e-mail's header/accent. All fields are optional —
/// a null <see cref="AccentColor"/> keeps the default EventPulse look, so unbranded events are
/// unaffected. Passed into <see cref="EmailLayout.Render"/> by whoever builds the message.
/// </summary>
public sealed record EmailBrand(
    string? AccentColor = null, string? LogoUrl = null, string? EventName = null, string? HeaderName = null)
{
    /// <summary>True when there is anything worth rendering (colour, logo, event name or custom label).</summary>
    public bool HasAny =>
        !string.IsNullOrWhiteSpace(AccentColor)
        || !string.IsNullOrWhiteSpace(LogoUrl)
        || !string.IsNullOrWhiteSpace(EventName)
        || !string.IsNullOrWhiteSpace(HeaderName);
}
