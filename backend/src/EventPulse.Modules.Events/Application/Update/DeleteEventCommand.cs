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

        _db.Set<Event>().Remove(ev);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
