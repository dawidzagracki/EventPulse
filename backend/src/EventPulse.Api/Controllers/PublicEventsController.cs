using EventPulse.Modules.Agenda.Application;
using EventPulse.Modules.Agenda.Domain;
using EventPulse.Modules.Events.Domain;
using EventPulse.Modules.Gallery;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using EventPulse.Shared.Storage;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Api.Controllers;

/// <summary>Anonymous read endpoints feeding the public event landing page (after publish).</summary>
[ApiController]
[Route("api/public/events/{eventId:guid}")]
[AllowAnonymous]
public sealed class PublicEventsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PublicEventsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<PublicEventDto>> Event(Guid eventId, CancellationToken ct)
        => Ok(await _mediator.Send(new PublicEventQuery(eventId), ct));

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
        var ev = await db.Set<Event>().AsNoTracking().IgnoreQueryFilters()
            .Where(e => e.Id == request.EventId && e.Status >= EventStatus.Published)
            .Select(e => new PublicEventDto(e.Id, e.Name, e.Slug, e.StartsAt, e.EndsAt, e.Location, e.DefaultLanguage, (int)e.Status))
            .FirstOrDefaultAsync(ct);

        return ev ?? throw new NotFoundException("Event not available.");
    }
}

public sealed record PublicAgendaQuery(Guid EventId) : IRequest<IReadOnlyList<AgendaItemDto>>;

public sealed class PublicAgendaHandler(IAppDbContext db) : IRequestHandler<PublicAgendaQuery, IReadOnlyList<AgendaItemDto>>
{
    public async Task<IReadOnlyList<AgendaItemDto>> Handle(PublicAgendaQuery request, CancellationToken ct)
    {
        var allowed = await db.Set<Event>().AsNoTracking().IgnoreQueryFilters()
            .AnyAsync(e => e.Id == request.EventId && e.Status >= EventStatus.Published, ct);
        if (!allowed) throw new NotFoundException("Event not available.");

        var items = await db.Set<AgendaItem>().AsNoTracking().IgnoreQueryFilters()
            .Where(a => a.EventId == request.EventId && a.GroupName == null)
            .OrderBy(a => a.StartsAt)
            .ToListAsync(ct);

        return items.Select(AgendaItemDto.From).ToList();
    }
}

public sealed record PublicGalleryQuery(Guid EventId) : IRequest<IReadOnlyList<PhotoDto>>;

public sealed class PublicGalleryHandler(IAppDbContext db) : IRequestHandler<PublicGalleryQuery, IReadOnlyList<PhotoDto>>
{
    public async Task<IReadOnlyList<PhotoDto>> Handle(PublicGalleryQuery request, CancellationToken ct)
    {
        var allowed = await db.Set<Event>().AsNoTracking().IgnoreQueryFilters()
            .AnyAsync(e => e.Id == request.EventId && e.Status >= EventStatus.Published, ct);
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
