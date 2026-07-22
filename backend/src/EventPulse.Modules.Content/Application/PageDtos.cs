using System.Text.Json;
using EventPulse.Modules.Content.Domain;

namespace EventPulse.Modules.Content.Application;

public sealed record BrandingDto(
    string PrimaryColor,
    string SecondaryColor,
    string AccentColor,
    string FontFamily,
    string? LogoUrl,
    string? FaviconUrl,
    string? BackgroundColor,
    bool HideNameInNav = false);

public sealed record SeoDto(string? Title, string? Description, string? OgImageUrl);

/// <summary>Editor view of the page (draft content as raw JSON).</summary>
public sealed record PageDto(
    Guid EventId,
    JsonElement Content,
    BrandingDto Branding,
    SeoDto Seo,
    int PublishedVersion,
    bool HasPublished,
    // True when a published snapshot exists but the current draft differs from it,
    // i.e. there are saved edits that are NOT yet live. Lets the editor warn "publish
    // to make your changes public" instead of the guest seeing a stale version.
    bool HasUnpublishedChanges)
{
    public static PageDto From(EventPage page) => new(
        page.EventId,
        Parse(page.DraftContent),
        new BrandingDto(page.PrimaryColor, page.SecondaryColor, page.AccentColor, page.FontFamily,
            page.LogoUrl, page.FaviconUrl, page.BackgroundColor, page.HideNameInNav),
        new SeoDto(page.SeoTitle, page.SeoDescription, page.OgImageUrl),
        page.PublishedVersion,
        page.PublishedContent is not null,
        page.PublishedContent is not null
            && !string.Equals(page.DraftContent, page.PublishedContent, StringComparison.Ordinal));

    internal static JsonElement Parse(string json) => JsonDocument.Parse(json).RootElement.Clone();
}

/// <summary>Public/participant render view (published snapshot only).</summary>
public sealed record PublishedPageDto(
    JsonElement Content,
    BrandingDto Branding,
    SeoDto Seo,
    int Version);

public sealed record PageVersionDto(int Version, DateTimeOffset PublishedAt);
