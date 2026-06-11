using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Queries;

public sealed record GetEventByIdQuery(Guid Id) : IRequest<EventDto>;

public sealed class GetEventByIdHandler : IRequestHandler<GetEventByIdQuery, EventDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public GetEventByIdHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<EventDto> Handle(GetEventByIdQuery request, CancellationToken cancellationToken)
    {
        var ev = await _db.Set<Event>().AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        // A Client may only open their own event. Treat anything else as "not found"
        // so we don't leak the existence of other clients' events.
        if (_currentUser.IsClient)
        {
            var email = _currentUser.Email?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(ev.ClientEmail)
                || !string.Equals(ev.ClientEmail, email, StringComparison.OrdinalIgnoreCase))
            {
                throw new NotFoundException("Event not found.");
            }
        }

        // Operator tokens are pinned to a single event id.
        if (_currentUser.IsOperator && _currentUser.EventId != ev.Id)
        {
            throw new NotFoundException("Event not found.");
        }

        return EventDto.From(ev);
    }
}
