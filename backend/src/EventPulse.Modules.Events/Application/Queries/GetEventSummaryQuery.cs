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
    EventStatus Status,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string? Location,
    string? Description);

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

        return new EventSummaryDto(ev.Id, ev.Name, ev.Status, ev.StartsAt, ev.EndsAt, ev.Location, ev.Description);
    }
}
