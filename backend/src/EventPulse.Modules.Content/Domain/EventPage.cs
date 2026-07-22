using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Content.Domain;

/// <summary>
/// The builder page for one event. <see cref="DraftContent"/> is the editable working copy;
/// <see cref="PublishedContent"/> is the last published snapshot that participants see.
/// Content is a JSON document of ordered blocks (rendered by the frontend).
/// </summary>
public sealed class EventPage : TenantEntity
{
    public Guid EventId { get; set; }

    public string DraftContent { get; set; } = PageContent.Empty;
    public string? PublishedContent { get; set; }
    public int PublishedVersion { get; set; }

    // Branding (propagated to blocks as CSS variables on the frontend).
    public string PrimaryColor { get; set; } = "#4f46e5";
    public string SecondaryColor { get; set; } = "#0ea5e9";
    public string AccentColor { get; set; } = "#f59e0b";
    public string FontFamily { get; set; } = "Inter";
    public string? LogoUrl { get; set; }
    public string? FaviconUrl { get; set; }
    public string? BackgroundColor { get; set; }

    /// <summary>Hides the event name beside the logo in the public nav (logo-only header).</summary>
    public bool HideNameInNav { get; set; }

    // SEO / Open Graph.
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public string? OgImageUrl { get; set; }
}
