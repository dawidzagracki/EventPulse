using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Update;

public sealed record ChangeEventStatusCommand(Guid Id, EventStatus NewStatus) : IRequest<EventDto>;

public sealed class ChangeEventStatusHandler : IRequestHandler<ChangeEventStatusCommand, EventDto>
{
    private readonly IAppDbContext _db;

    public ChangeEventStatusHandler(IAppDbContext db) => _db = db;

    public async Task<EventDto> Handle(ChangeEventStatusCommand request, CancellationToken cancellationToken)
    {
        var ev = await _db.Set<Event>()
            .FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        if (!EventStatusTransitions.IsAllowed(ev.Status, request.NewStatus))
        {
            throw new ConflictException($"Cannot change status from {ev.Status} to {request.NewStatus}.");
        }

        ev.Status = request.NewStatus;
        await _db.SaveChangesAsync(cancellationToken);
        return EventDto.From(ev);
    }
}
