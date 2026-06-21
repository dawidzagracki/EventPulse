using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Clients;

/// <summary>
/// Replaces the full set of client accounts that may access an event (idempotent "set" semantics).
/// Agency-only. Returns the resulting set of client ids.
/// </summary>
public sealed record SetEventClientsCommand(Guid EventId, IReadOnlyList<Guid> ClientUserIds)
    : IRequest<IReadOnlyList<Guid>>;

public sealed class SetEventClientsHandler : IRequestHandler<SetEventClientsCommand, IReadOnlyList<Guid>>
{
    private readonly IAppDbContext _db;

    public SetEventClientsHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<Guid>> Handle(SetEventClientsCommand request, CancellationToken ct)
    {
        var exists = await _db.Set<Event>().AnyAsync(e => e.Id == request.EventId, ct);
        if (!exists)
        {
            throw new NotFoundException("Event not found.");
        }

        var desired = request.ClientUserIds.Where(id => id != Guid.Empty).Distinct().ToHashSet();

        var current = await _db.Set<EventClientAssignment>()
            .Where(a => a.EventId == request.EventId)
            .ToListAsync(ct);

        var toRemove = current.Where(a => !desired.Contains(a.ClientUserId)).ToList();
        if (toRemove.Count > 0)
        {
            _db.Set<EventClientAssignment>().RemoveRange(toRemove);
        }

        var existing = current.Select(a => a.ClientUserId).ToHashSet();
        foreach (var clientId in desired.Where(id => !existing.Contains(id)))
        {
            _db.Set<EventClientAssignment>().Add(new EventClientAssignment
            {
                EventId = request.EventId,
                ClientUserId = clientId,
            });
        }

        await _db.SaveChangesAsync(ct);
        return desired.ToList();
    }
}
