using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Update;

/// <summary>
/// Permanently removes an event. Module-keyed dependent data (participants,
/// scans, page, agenda, …) is keyed by EventId with no cross-module FK, so it
/// simply becomes unreachable — every other endpoint requires a live event.
/// </summary>
public sealed record DeleteEventCommand(Guid Id) : IRequest;

public sealed class DeleteEventHandler : IRequestHandler<DeleteEventCommand>
{
    private readonly IAppDbContext _db;

    public DeleteEventHandler(IAppDbContext db) => _db = db;

    public async Task Handle(DeleteEventCommand request, CancellationToken cancellationToken)
    {
        var ev = await _db.Set<Event>()
            .FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        // Client-access grants point at this event by id; drop them so the join table
        // doesn't accumulate dead rows (everything else is unreachable by design).
        var assignments = await _db.Set<EventClientAssignment>()
            .Where(a => a.EventId == request.Id)
            .ToListAsync(cancellationToken);
        if (assignments.Count > 0)
        {
            _db.Set<EventClientAssignment>().RemoveRange(assignments);
        }

        _db.Set<Event>().Remove(ev);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
