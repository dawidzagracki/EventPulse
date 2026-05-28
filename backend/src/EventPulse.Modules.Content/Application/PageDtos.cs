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
    string? BackgroundColor);

public sealed record SeoDto(string? Title, string? Description, string? OgImageUrl);

/// <summary>Editor view of the page (draft content as raw JSON).</summary>
public sealed record PageDto(
    Guid EventId,
    JsonElement Content,
    BrandingDto Branding,
    SeoDto Seo,
    int PublishedVersion,
    bool HasPublished)
{
    public static PageDto From(EventPage page) => new(
        page.EventId,
        Parse(page.DraftContent),
        new BrandingDto(page.PrimaryColor, page.SecondaryColor, page.AccentColor, page.FontFamily,
            page.LogoUrl, page.FaviconUrl, page.BackgroundColor),
        new SeoDto(page.SeoTitle, page.SeoDescription, page.OgImageUrl),
        page.PublishedVersion,
        page.PublishedContent is not null);

    internal static JsonElement Parse(string json) => JsonDocument.Parse(json).RootElement.Clone();
}

/// <summary>Public/participant render view (published snapshot only).</summary>
public sealed record PublishedPageDto(
    JsonElement Content,
    BrandingDto Branding,
    SeoDto Seo,
    int Version);

public sealed record PageVersionDto(int Version, DateTimeOffset PublishedAt);
