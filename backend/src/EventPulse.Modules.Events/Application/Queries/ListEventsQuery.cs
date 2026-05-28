using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Queries;

public sealed record ListEventsQuery(EventStatus? Status, string? Search) : IRequest<IReadOnlyList<EventDto>>;

public sealed class ListEventsHandler : IRequestHandler<ListEventsQuery, IReadOnlyList<EventDto>>
{
    private readonly IAppDbContext _db;

    public ListEventsHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<EventDto>> Handle(ListEventsQuery request, CancellationToken cancellationToken)
    {
        var query = _db.Set<Event>().AsNoTracking();

        if (request.Status is { } status)
        {
            query = query.Where(e => e.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(e => e.Name.ToLower().Contains(term));
        }

        var events = await query
            .OrderByDescending(e => e.StartsAt)
            .ToListAsync(cancellationToken);

        return events.Select(EventDto.From).ToList();
    }
}
