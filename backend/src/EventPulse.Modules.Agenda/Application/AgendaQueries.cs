using EventPulse.Modules.Agenda.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Agenda.Application;

public sealed record ListAgendaQuery(Guid EventId) : IRequest<IReadOnlyList<AgendaItemDto>>;

public sealed class ListAgendaHandler : IRequestHandler<ListAgendaQuery, IReadOnlyList<AgendaItemDto>>
{
    private readonly IAppDbContext _db;

    public ListAgendaHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<AgendaItemDto>> Handle(ListAgendaQuery request, CancellationToken cancellationToken)
    {
        var items = await _db.Set<AgendaItem>().AsNoTracking()
            .Where(i => i.EventId == request.EventId)
            .OrderBy(i => i.StartsAt)
            .ToListAsync(cancellationToken);

        return items.Select(AgendaItemDto.From).ToList();
    }
}

/// <summary>Participant view: common items plus those for the participant's group.</summary>
public sealed record ParticipantAgendaQuery(Guid EventId, string? GroupName) : IRequest<IReadOnlyList<AgendaItemDto>>;

public sealed class ParticipantAgendaHandler : IRequestHandler<ParticipantAgendaQuery, IReadOnlyList<AgendaItemDto>>
{
    private readonly IAppDbContext _db;

    public ParticipantAgendaHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<AgendaItemDto>> Handle(ParticipantAgendaQuery request, CancellationToken cancellationToken)
    {
        var items = await _db.Set<AgendaItem>().AsNoTracking()
            .Where(i => i.EventId == request.EventId
                        && (i.GroupName == null || i.GroupName == request.GroupName))
            .OrderBy(i => i.StartsAt)
            .ToListAsync(cancellationToken);

        return items.Select(AgendaItemDto.From).ToList();
    }
}
