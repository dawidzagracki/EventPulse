using EventPulse.Modules.Content.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using EventPulse.Shared.Storage;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Content.Application;

internal static class PageStore
{
    public static async Task<EventPage> EnsureAsync(IAppDbContext db, Guid eventId, CancellationToken ct)
    {
        var page = await db.Set<EventPage>().FirstOrDefaultAsync(p => p.EventId == eventId, ct);
        if (page is null)
        {
            page = new EventPage { EventId = eventId };
            db.Set<EventPage>().Add(page);
            await db.SaveChangesAsync(ct);
        }

        return page;
    }
}

// ---- Draft ----

public sealed record GetDraftQuery(Guid EventId) : IRequest<PageDto>;

public sealed class GetDraftHandler(IAppDbContext db) : IRequestHandler<GetDraftQuery, PageDto>
{
    public async Task<PageDto> Handle(GetDraftQuery request, CancellationToken ct)
        => PageDto.From(await PageStore.EnsureAsync(db, request.EventId, ct));
}

/// <summary>Minimal branding (logo + colours) for the participant app header. Read-only — never creates a page.</summary>
public sealed record ParticipantBrandingDto(string? LogoUrl, string? PrimaryColor, string? AccentColor);

public sealed record GetParticipantBrandingQuery(Guid EventId) : IRequest<ParticipantBrandingDto>;

public sealed class GetParticipantBrandingHandler(IAppDbContext db)
    : IRequestHandler<GetParticipantBrandingQuery, ParticipantBrandingDto>
{
    public async Task<ParticipantBrandingDto> Handle(GetParticipantBrandingQuery request, CancellationToken ct)
    {
        var page = await db.Set<EventPage>().AsNoTracking()
            .FirstOrDefaultAsync(p => p.EventId == request.EventId, ct);
        return new ParticipantBrandingDto(page?.LogoUrl, page?.PrimaryColor, page?.AccentColor);
    }
}

public sealed record SaveDraftCommand(Guid EventId, string ContentJson) : IRequest<PageDto>;

public sealed class SaveDraftHandler(IAppDbContext db) : IRequestHandler<SaveDraftCommand, PageDto>
{
    public async Task<PageDto> Handle(SaveDraftCommand request, CancellationToken ct)
    {
        var page = await PageStore.EnsureAsync(db, request.EventId, ct);
        page.DraftContent = PageContent.ValidateAndSanitize(request.ContentJson);
        await db.SaveChangesAsync(ct);
        return PageDto.From(page);
    }
}

public sealed record ApplyTemplateCommand(Guid EventId, string TemplateKey) : IRequest<PageDto>;

public sealed class ApplyTemplateHandler(IAppDbContext db) : IRequestHandler<ApplyTemplateCommand, PageDto>
{
    public async Task<PageDto> Handle(ApplyTemplateCommand request, CancellationToken ct)
    {
        if (!PageTemplates.Exists(request.TemplateKey))
        {
            throw new NotFoundException($"Unknown template '{request.TemplateKey}'.");
        }

        var page = await PageStore.EnsureAsync(db, request.EventId, ct);
        page.DraftContent = PageTemplates.Build(request.TemplateKey);
        await db.SaveChangesAsync(ct);
        return PageDto.From(page);
    }
}

// ---- Branding / SEO ----

public sealed record UpdateBrandingCommand(Guid EventId, BrandingDto Branding) : IRequest<PageDto>;

public sealed class UpdateBrandingHandler(IAppDbContext db) : IRequestHandler<UpdateBrandingCommand, PageDto>
{
    public async Task<PageDto> Handle(UpdateBrandingCommand request, CancellationToken ct)
    {
        var page = await PageStore.EnsureAsync(db, request.EventId, ct);
        var b = request.Branding;
        page.PrimaryColor = b.PrimaryColor;
        page.SecondaryColor = b.SecondaryColor;
        page.AccentColor = b.AccentColor;
        page.FontFamily = b.FontFamily;
        page.LogoUrl = b.LogoUrl;
        page.FaviconUrl = b.FaviconUrl;
        page.BackgroundColor = b.BackgroundColor;
        await db.SaveChangesAsync(ct);
        return PageDto.From(page);
    }
}

/// <summary>
/// Uploads a logo image to object storage and points the page's LogoUrl at the anonymous public
/// logo endpoint. Key is deterministic per event (one logo), so re-upload overwrites; a cache-bust
/// query on the URL makes the new image show immediately.
/// </summary>
public sealed record UploadLogoCommand(Guid EventId, string ContentType, byte[] Content) : IRequest<PageDto>;

public sealed class UploadLogoHandler(IAppDbContext db, IFileStorage storage) : IRequestHandler<UploadLogoCommand, PageDto>
{
    public async Task<PageDto> Handle(UploadLogoCommand request, CancellationToken ct)
    {
        var page = await PageStore.EnsureAsync(db, request.EventId, ct);
        var key = $"events/{request.EventId}/branding/logo";
        using var ms = new MemoryStream(request.Content);
        await storage.UploadAsync(key, ms, request.ContentType, ct);
        // App-relative URL — the front-end resolves it against the API base (same-origin in prod).
        page.LogoUrl = $"/api/public/events/{request.EventId}/logo?v={Guid.NewGuid():N}";
        await db.SaveChangesAsync(ct);
        return PageDto.From(page);
    }
}

public sealed record UpdateSeoCommand(Guid EventId, SeoDto Seo) : IRequest<PageDto>;

public sealed class UpdateSeoHandler(IAppDbContext db) : IRequestHandler<UpdateSeoCommand, PageDto>
{
    public async Task<PageDto> Handle(UpdateSeoCommand request, CancellationToken ct)
    {
        var page = await PageStore.EnsureAsync(db, request.EventId, ct);
        page.SeoTitle = request.Seo.Title;
        page.SeoDescription = request.Seo.Description;
        page.OgImageUrl = request.Seo.OgImageUrl;
        await db.SaveChangesAsync(ct);
        return PageDto.From(page);
    }
}

// ---- Publish / versions ----

public sealed record PublishCommand(Guid EventId) : IRequest<PageDto>;

public sealed class PublishHandler(IAppDbContext db) : IRequestHandler<PublishCommand, PageDto>
{
    public async Task<PageDto> Handle(PublishCommand request, CancellationToken ct)
    {
        var page = await PageStore.EnsureAsync(db, request.EventId, ct);
        var version = page.PublishedVersion + 1;

        db.Set<PageVersion>().Add(new PageVersion
        {
            EventPageId = page.Id,
            Version = version,
            Content = page.DraftContent,
            PublishedAt = DateTimeOffset.UtcNow,
        });

        page.PublishedContent = page.DraftContent;
        page.PublishedVersion = version;
        await db.SaveChangesAsync(ct);
        return PageDto.From(page);
    }
}

public sealed record ListVersionsQuery(Guid EventId) : IRequest<IReadOnlyList<PageVersionDto>>;

public sealed class ListVersionsHandler(IAppDbContext db) : IRequestHandler<ListVersionsQuery, IReadOnlyList<PageVersionDto>>
{
    public async Task<IReadOnlyList<PageVersionDto>> Handle(ListVersionsQuery request, CancellationToken ct)
    {
        var page = await db.Set<EventPage>().AsNoTracking()
            .FirstOrDefaultAsync(p => p.EventId == request.EventId, ct);
        if (page is null)
        {
            return [];
        }

        return await db.Set<PageVersion>().AsNoTracking()
            .Where(v => v.EventPageId == page.Id)
            .OrderByDescending(v => v.Version)
            .Select(v => new PageVersionDto(v.Version, v.PublishedAt))
            .ToListAsync(ct);
    }
}

public sealed record RestoreVersionCommand(Guid EventId, int Version) : IRequest<PageDto>;

public sealed class RestoreVersionHandler(IAppDbContext db) : IRequestHandler<RestoreVersionCommand, PageDto>
{
    public async Task<PageDto> Handle(RestoreVersionCommand request, CancellationToken ct)
    {
        var page = await PageStore.EnsureAsync(db, request.EventId, ct);
        var version = await db.Set<PageVersion>()
            .FirstOrDefaultAsync(v => v.EventPageId == page.Id && v.Version == request.Version, ct)
            ?? throw new NotFoundException($"Version {request.Version} not found.");

        page.DraftContent = version.Content;
        await db.SaveChangesAsync(ct);
        return PageDto.From(page);
    }
}

// ---- Public render ----

public sealed record GetPublishedPageQuery(Guid EventId) : IRequest<PublishedPageDto>;

public sealed class GetPublishedPageHandler(IAppDbContext db) : IRequestHandler<GetPublishedPageQuery, PublishedPageDto>
{
    public async Task<PublishedPageDto> Handle(GetPublishedPageQuery request, CancellationToken ct)
    {
        // Published pages are public; anonymous render has no tenant context, so bypass the filter.
        var page = await db.Set<EventPage>().AsNoTracking().IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.EventId == request.EventId, ct);

        if (page?.PublishedContent is null)
        {
            throw new NotFoundException("Page is not published yet.");
        }

        return new PublishedPageDto(
            PageDto.Parse(page.PublishedContent),
            new BrandingDto(page.PrimaryColor, page.SecondaryColor, page.AccentColor, page.FontFamily,
                page.LogoUrl, page.FaviconUrl, page.BackgroundColor),
            new SeoDto(page.SeoTitle, page.SeoDescription, page.OgImageUrl),
            page.PublishedVersion);
    }
}
