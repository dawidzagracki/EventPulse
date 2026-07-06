using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Queries;

/// <summary>Participant-safe view of an event (no internal fields like client e-mail).</summary>
public sealed record EventSummaryDto(
    Guid Id,
    string Name,
    string Slug,
    EventStatus Status,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string? Location,
    string? Description,
    bool UsesLocationData,
    bool PhoneRequired,
    bool AllowCompanions,
    int MaxCompanions,
    string? CustomPhotosUrl,
    string? CustomPhotosText,
    bool ShowAgendaTab,
    bool ShowActivitiesTab,
    bool ShowGalleryTab,
    bool ShowPreferencesTile,
    bool ShowShirtSize);

/// <summary>
/// Loads a lightweight event summary for the in-app participant view. Tenant-scoped
/// by the global query filter; the caller passes their own event id, so no extra check needed.
/// </summary>
public sealed record GetEventSummaryQuery(Guid EventId) : IRequest<EventSummaryDto>;

public sealed class GetEventSummaryHandler : IRequestHandler<GetEventSummaryQuery, EventSummaryDto>
{
    private readonly IAppDbContext _db;

    public GetEventSummaryHandler(IAppDbContext db) => _db = db;

    public async Task<EventSummaryDto> Handle(GetEventSummaryQuery request, CancellationToken cancellationToken)
    {
        var ev = await _db.Set<Event>().AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == request.EventId, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        return new EventSummaryDto(
            ev.Id, ev.Name, ev.Slug, ev.Status, ev.StartsAt, ev.EndsAt, ev.Location, ev.Description,
            ev.UsesLocationData, ev.PhoneRequired, ev.AllowCompanions, ev.MaxCompanions,
            ev.CustomPhotosUrl, ev.CustomPhotosText,
            ev.ShowAgendaTab, ev.ShowActivitiesTab, ev.ShowGalleryTab, ev.ShowPreferencesTile, ev.ShowShirtSize);
    }
}
