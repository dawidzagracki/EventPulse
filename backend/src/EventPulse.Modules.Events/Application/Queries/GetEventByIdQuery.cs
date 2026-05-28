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

    public GetEventByIdHandler(IAppDbContext db) => _db = db;

    public async Task<EventDto> Handle(GetEventByIdQuery request, CancellationToken cancellationToken)
    {
        var ev = await _db.Set<Event>().AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        return EventDto.From(ev);
    }
}
