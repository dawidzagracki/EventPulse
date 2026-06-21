using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Clients;

/// <summary>
/// Ids of the client accounts explicitly granted access to an event. Agency-only
/// (the controller enforces the policy). Returns bare ids; the caller resolves names
/// from the team list so the Events module need not reference Identity.
/// </summary>
public sealed record GetEventClientsQuery(Guid EventId) : IRequest<IReadOnlyList<Guid>>;

public sealed class GetEventClientsHandler : IRequestHandler<GetEventClientsQuery, IReadOnlyList<Guid>>
{
    private readonly IAppDbContext _db;

    public GetEventClientsHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<Guid>> Handle(GetEventClientsQuery request, CancellationToken ct)
    {
        // The tenant query filter guarantees we only ever see this agency's event.
        var exists = await _db.Set<Event>().AnyAsync(e => e.Id == request.EventId, ct);
        if (!exists)
        {
            throw new NotFoundException("Event not found.");
        }

        return await _db.Set<EventClientAssignment>()
            .Where(a => a.EventId == request.EventId)
            .Select(a => a.ClientUserId)
            .ToListAsync(ct);
    }
}
