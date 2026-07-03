using EventPulse.Modules.Agenda.Application;
using EventPulse.Modules.Agenda.Domain;
using EventPulse.Modules.Engagement;
using EventPulse.Modules.Events.Domain;
using EventPulse.Modules.Gallery;
using EventPulse.Modules.Participants.Application.Auth;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using EventPulse.Shared.Storage;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Api.Controllers;

/// <summary>Anonymous read endpoints feeding the public event landing page (after publish).</summary>
[ApiController]
[Route("api/public/events/{eventId:guid}")]
[AllowAnonymous]
public sealed class PublicEventsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IConfiguration _configuration;

    public PublicEventsController(IMediator mediator, IConfiguration configuration)
    {
        _mediator = mediator;
        _configuration = configuration;
    }

    private string ParticipantLinkBaseUrl =>
        _configuration["App:ParticipantLinkBaseUrl"] ?? "http://localhost:5173/p";

    [HttpGet]
    public async Task<ActionResult<PublicEventDto>> Event(Guid eventId, CancellationToken ct)
        => Ok(await _mediator.Send(new PublicEventQuery(eventId), ct));

    /// <summary>Second login path: e-mail me my personal token link. Always returns a generic OK.</summary>
    [HttpPost("request-link")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> RequestLink(Guid eventId, RequestLinkBody body, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(body.Email))
        {
            await _mediator.Send(new RequestLoginLinkCommand(eventId, body.Email, ParticipantLinkBaseUrl), ct);
        }

        // Never reveal whether the address is registered.
        return Ok(new { ok = true });
    }

    public sealed record RequestLinkBody(string Email);

    [HttpGet("agenda")]
    public async Task<ActionResult<IReadOnlyList<AgendaItemDto>>> Agenda(Guid eventId, CancellationToken ct)
        => Ok(await _mediator.Send(new PublicAgendaQuery(eventId), ct));

    [HttpGet("gallery")]
    public async Task<ActionResult<IReadOnlyList<PhotoDto>>> Gallery(Guid eventId, CancellationToken ct)
        => Ok(await _mediator.Send(new PublicGalleryQuery(eventId), ct));

    [HttpGet("gallery/{photoId:guid}/file")]
    public async Task<IActionResult> GalleryFile(Guid eventId, Guid photoId, CancellationToken ct)
    {
        var stored = await _mediator.Send(new PublicPhotoFileQuery(eventId, photoId), ct);
        return File(stored.Content, stored.ContentType);
    }

    [HttpGet("contests")]
    public async Task<ActionResult<IReadOnlyList<PublicContestDto>>> Contests(Guid eventId, CancellationToken ct)
        => Ok(await _mediator.Send(new PublicContestsQuery(eventId), ct));

    [HttpGet("quizzes")]
    public async Task<ActionResult<IReadOnlyList<PublicQuizDto>>> Quizzes(Guid eventId, CancellationToken ct)
        => Ok(await _mediator.Send(new PublicQuizzesQuery(eventId), ct));

    /// <summary>Serves an uploaded branding logo (referenced by the page's LogoUrl). Anonymous.</summary>
    [HttpGet("logo")]
    public async Task<IActionResult> Logo(Guid eventId, CancellationToken ct)
    {
        var stored = await _mediator.Send(new PublicLogoQuery(eventId), ct);
        return File(stored.Content, stored.ContentType);
    }
}

public sealed record PublicLogoQuery(Guid EventId) : IRequest<StoredFile>;

public sealed class PublicLogoHandler(IFileStorage storage) : IRequestHandler<PublicLogoQuery, StoredFile>
{
    public async Task<StoredFile> Handle(PublicLogoQuery request, CancellationToken ct)
    {
        try
        {
            return await storage.DownloadAsync($"events/{request.EventId}/branding/logo", ct);
        }
        catch
        {
            throw new NotFoundException("Logo not found.");
        }
    }
}

public sealed record PublicContestDto(Guid Id, string Name, int Mode);

public sealed record PublicContestsQuery(Guid EventId) : IRequest<IReadOnlyList<PublicContestDto>>;

public sealed class PublicContestsHandler(IAppDbContext db) : IRequestHandler<PublicContestsQuery, IReadOnlyList<PublicContestDto>>
{
    public async Task<IReadOnlyList<PublicContestDto>> Handle(PublicContestsQuery request, CancellationToken ct)
    {
        var allowed = await db.Set<Event>().AsNoTracking().IgnoreQueryFilters()
            .AnyAsync(e => e.Id == request.EventId && e.Status != EventStatus.Archived, ct);
        if (!allowed) throw new NotFoundException("Event not available.");

        return await db.Set<Contest>().AsNoTracking().IgnoreQueryFilters()
            .Where(c => c.EventId == request.EventId)
            .OrderBy(c => c.Name)
            .Select(c => new PublicContestDto(c.Id, c.Name, (int)c.Mode))
            .ToListAsync(ct);
    }
}

public sealed record PublicQuizDto(Guid Id, string Title);

public sealed record PublicQuizzesQuery(Guid EventId) : IRequest<IReadOnlyList<PublicQuizDto>>;

public sealed class PublicQuizzesHandler(IAppDbContext db) : IRequestHandler<PublicQuizzesQuery, IReadOnlyList<PublicQuizDto>>
{
    public async Task<IReadOnlyList<PublicQuizDto>> Handle(PublicQuizzesQuery request, CancellationToken ct)
    {
        var allowed = await db.Set<Event>().AsNoTracking().IgnoreQueryFilters()
            .AnyAsync(e => e.Id == request.EventId && e.Status != EventStatus.Archived, ct);
        if (!allowed) throw new NotFoundException("Event not available.");

        return await db.Set<Quiz>().AsNoTracking().IgnoreQueryFilters()
            .Where(q => q.EventId == request.EventId)
            .OrderBy(q => q.Title)
            .Select(q => new PublicQuizDto(q.Id, q.Title))
            .ToListAsync(ct);
    }
}

public sealed record PublicEventDto(
    Guid Id,
    string Name,
    string Slug,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string? Location,
    string DefaultLanguage,
    int Status);

public sealed record PublicEventQuery(Guid EventId) : IRequest<PublicEventDto>;

public sealed class PublicEventHandler(IAppDbContext db) : IRequestHandler<PublicEventQuery, PublicEventDto>
{
    public async Task<PublicEventDto> Handle(PublicEventQuery request, CancellationToken ct)
    {
        // Gate the public event (and its sub-resources: agenda/gallery/countdown) the SAME way as the
        // published page and by-slug route — the real public gate is publishing the PAGE, not the event
        // status. Otherwise a Draft event with a published page renders the page but 404s here, which
        // silently starves the agenda and countdown (they key off this event's data).
        var ev = await db.Set<Event>().AsNoTracking().IgnoreQueryFilters()
            .Where(e => e.Id == request.EventId && e.Status != EventStatus.Archived)
            .Select(e => new PublicEventDto(e.Id, e.Name, e.Slug, e.StartsAt, e.EndsAt, e.Location, e.DefaultLanguage, (int)e.Status))
            .FirstOrDefaultAsync(ct);

        return ev ?? throw new NotFoundException("Event not available.");
    }
}

/// <summary>Resolves a friendly slug to the public event (so the SPA can load /public/{slug}).</summary>
public sealed record PublicEventBySlugQuery(string Slug) : IRequest<PublicEventDto>;

public sealed class PublicEventBySlugHandler(IAppDbContext db) : IRequestHandler<PublicEventBySlugQuery, PublicEventDto>
{
    public async Task<PublicEventDto> Handle(PublicEventBySlugQuery request, CancellationToken ct)
    {
        // Slug resolution is just a friendly alias for the event id — gate it the SAME way as the
        // id-based page route (which serves any event whose page snapshot is published), so the
        // short URL works whenever the GUID URL does. Publishing the PAGE is the real public gate.
        var ev = await db.Set<Event>().AsNoTracking().IgnoreQueryFilters()
            .Where(e => e.Slug == request.Slug && e.Status != EventStatus.Archived)
            .Select(e => new PublicEventDto(e.Id, e.Name, e.Slug, e.StartsAt, e.EndsAt, e.Location, e.DefaultLanguage, (int)e.Status))
            .FirstOrDefaultAsync(ct);

        return ev ?? throw new NotFoundException("Event not available.");
    }
}

/// <summary>Slug resolution lives on its own route (the main controller is keyed by GUID).</summary>
[ApiController]
[Route("api/public")]
[AllowAnonymous]
public sealed class PublicSlugController : ControllerBase
{
    private readonly IMediator _mediator;

    public PublicSlugController(IMediator mediator) => _mediator = mediator;

    [HttpGet("by-slug/{slug}")]
    public async Task<ActionResult<PublicEventDto>> BySlug(string slug, CancellationToken ct)
        => Ok(await _mediator.Send(new PublicEventBySlugQuery(slug), ct));
}

public sealed record PublicAgendaQuery(Guid EventId) : IRequest<IReadOnlyList<AgendaItemDto>>;

public sealed class PublicAgendaHandler(IAppDbContext db) : IRequestHandler<PublicAgendaQuery, IReadOnlyList<AgendaItemDto>>
{
    public async Task<IReadOnlyList<AgendaItemDto>> Handle(PublicAgendaQuery request, CancellationToken ct)
    {
        var allowed = await db.Set<Event>().AsNoTracking().IgnoreQueryFilters()
            .AnyAsync(e => e.Id == request.EventId && e.Status != EventStatus.Archived, ct);
        if (!allowed) throw new NotFoundException("Event not available.");

        var items = await db.Set<AgendaItem>().AsNoTracking().IgnoreQueryFilters()
            .Where(a => a.EventId == request.EventId && a.GroupName == null)
            .OrderBy(a => a.StartsAt)
            .ToListAsync(ct);

        var types = await AgendaTypeLookup.ForEventAsync(db, request.EventId, ct, ignoreFilters: true);
        return AgendaItemDto.Enrich(items, types);
    }
}

public sealed record PublicGalleryQuery(Guid EventId) : IRequest<IReadOnlyList<PhotoDto>>;

public sealed class PublicGalleryHandler(IAppDbContext db) : IRequestHandler<PublicGalleryQuery, IReadOnlyList<PhotoDto>>
{
    public async Task<IReadOnlyList<PhotoDto>> Handle(PublicGalleryQuery request, CancellationToken ct)
    {
        var allowed = await db.Set<Event>().AsNoTracking().IgnoreQueryFilters()
            .AnyAsync(e => e.Id == request.EventId && e.Status != EventStatus.Archived, ct);
        if (!allowed) throw new NotFoundException("Event not available.");

        var photos = await db.Set<Photo>().AsNoTracking().IgnoreQueryFilters()
            .Where(p => p.EventId == request.EventId && p.Published)
            .OrderByDescending(p => p.UploadedAt)
            .ToListAsync(ct);

        return photos.Select(PhotoDto.From).ToList();
    }
}

public sealed record PublicPhotoFileQuery(Guid EventId, Guid PhotoId) : IRequest<StoredFile>;

public sealed class PublicPhotoFileHandler(IAppDbContext db, IFileStorage storage)
    : IRequestHandler<PublicPhotoFileQuery, StoredFile>
{
    public async Task<StoredFile> Handle(PublicPhotoFileQuery request, CancellationToken ct)
    {
        var photo = await db.Set<Photo>().AsNoTracking().IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == request.PhotoId && p.EventId == request.EventId && p.Published, ct)
            ?? throw new NotFoundException("Photo not available.");

        return await storage.DownloadAsync(photo.StorageKey, ct);
    }
}
