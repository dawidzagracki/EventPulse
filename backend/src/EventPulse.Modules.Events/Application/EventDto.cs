using EventPulse.Modules.Events.Domain;

namespace EventPulse.Modules.Events.Application;

public sealed record EventDto(
    Guid Id,
    string Name,
    string Slug,
    EventStatus Status,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string? Location,
    string? Description,
    string DefaultLanguage,
    string? ClientEmail,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    EventSettingsDto Settings,
    EmailBrandingDto EmailBranding)
{
    public static EventDto From(Event e) => new(
        e.Id, e.Name, e.Slug, e.Status, e.StartsAt, e.EndsAt,
        e.Location, e.Description, e.DefaultLanguage, e.ClientEmail, e.CreatedAt, e.UpdatedAt,
        EventSettingsDto.From(e), EmailBrandingDto.From(e));
}

/// <summary>Per-event transactional e-mail branding (header colour + logo).</summary>
public sealed record EmailBrandingDto(string? AccentColor, string? LogoUrl, string? HeaderName, string? FromName, string? Subject)
{
    public static EmailBrandingDto From(Event e) => new(e.EmailAccentColor, e.EmailLogoUrl, e.EmailHeaderName, e.EmailFromName, e.EmailSubject);
}

/// <summary>Per-event configurable settings (privacy, phone, companions, anonymization, photos).</summary>
public sealed record EventSettingsDto(
    bool UsesLocationData,
    bool PhoneRequired,
    bool AllowCompanions,
    int MaxCompanions,
    bool AnonymizeEnabled,
    int AnonymizeAfterDays,
    DateTimeOffset? AnonymizedAt,
    string? CustomPhotosUrl,
    string? CustomPhotosText,
    bool ShowAgendaTab,
    bool ShowActivitiesTab,
    bool ShowGalleryTab,
    bool ShowPreferencesTile,
    bool ShowShirtSize,
    bool AllowSelfRegistration,
    string? CompanyName,
    bool ShowPhotoConsent,
    bool AppUseBrandColors)
{
    public static EventSettingsDto From(Event e) => new(
        e.UsesLocationData, e.PhoneRequired, e.AllowCompanions, e.MaxCompanions,
        e.AnonymizeEnabled, e.AnonymizeAfterDays, e.AnonymizedAt, e.CustomPhotosUrl, e.CustomPhotosText,
        e.ShowAgendaTab, e.ShowActivitiesTab, e.ShowGalleryTab, e.ShowPreferencesTile, e.ShowShirtSize, e.AllowSelfRegistration,
        e.CompanyName, e.ShowPhotoConsent, e.AppUseBrandColors);
}
