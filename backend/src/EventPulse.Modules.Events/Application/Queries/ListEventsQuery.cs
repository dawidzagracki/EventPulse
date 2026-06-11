using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Queries;

public sealed record ListEventsQuery(EventStatus? Status, string? Search) : IRequest<IReadOnlyList<EventDto>>;

public sealed class ListEventsHandler : IRequestHandler<ListEventsQuery, IReadOnlyList<EventDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public ListEventsHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<EventDto>> Handle(ListEventsQuery request, CancellationToken cancellationToken)
    {
        var query = _db.Set<Event>().AsNoTracking();

        // A Client end-user only ever sees the events they're assigned to
        // (matched by the e-mail on their token). Agency staff see all tenant events.
        if (_currentUser.IsClient)
        {
            var email = _currentUser.Email?.Trim().ToLowerInvariant();
            query = query.Where(e => e.ClientEmail != null && e.ClientEmail == email);
        }

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
