using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Queries;

public sealed record ListParticipantsQuery(Guid EventId, ParticipantStatus? Status, string? Search)
    : IRequest<IReadOnlyList<ParticipantDto>>;

public sealed class ListParticipantsHandler : IRequestHandler<ListParticipantsQuery, IReadOnlyList<ParticipantDto>>
{
    private readonly IAppDbContext _db;

    public ListParticipantsHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<ParticipantDto>> Handle(ListParticipantsQuery request, CancellationToken cancellationToken)
    {
        var query = _db.Set<Participant>().AsNoTracking().Where(p => p.EventId == request.EventId);

        if (request.Status is { } status)
        {
            query = query.Where(p => p.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(p =>
                p.FirstName.ToLower().Contains(term) ||
                p.LastName.ToLower().Contains(term) ||
                (p.Email != null && p.Email.ToLower().Contains(term)));
        }

        var participants = await query
            .OrderBy(p => p.LastName).ThenBy(p => p.FirstName)
            .ToListAsync(cancellationToken);

        return participants.Select(ParticipantDto.From).ToList();
    }
}
