using EventPulse.Modules.Agenda.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Agenda.Application;

public sealed record AgendaTypeDto(Guid Id, string NamePl, string? NameEn, string Color, string? Icon, int Order)
{
    public static AgendaTypeDto From(AgendaType t) => new(t.Id, t.NamePl, t.NameEn, t.Color, t.Icon, t.Order);
}

public sealed record AgendaTypeInput(Guid? Id, string NamePl, string? NameEn, string Color, string? Icon);

/// <summary>Shared loader that builds an id → <see cref="AgendaType"/> lookup for denormalizing agenda DTOs.</summary>
public static class AgendaTypeLookup
{
    public static async Task<IReadOnlyDictionary<Guid, AgendaType>> ForEventAsync(
        IAppDbContext db, Guid eventId, CancellationToken ct, bool ignoreFilters = false)
    {
        var query = db.Set<AgendaType>().AsNoTracking();
        if (ignoreFilters)
        {
            query = query.IgnoreQueryFilters();
        }

        var types = await query.Where(t => t.EventId == eventId).ToListAsync(ct);
        return types.ToDictionary(t => t.Id);
    }
}

public sealed record ListAgendaTypesQuery(Guid EventId) : IRequest<IReadOnlyList<AgendaTypeDto>>;

public sealed class ListAgendaTypesHandler : IRequestHandler<ListAgendaTypesQuery, IReadOnlyList<AgendaTypeDto>>
{
    private readonly IAppDbContext _db;

    public ListAgendaTypesHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<AgendaTypeDto>> Handle(ListAgendaTypesQuery request, CancellationToken cancellationToken)
    {
        var types = await _db.Set<AgendaType>().AsNoTracking()
            .Where(t => t.EventId == request.EventId)
            .OrderBy(t => t.Order)
            .ToListAsync(cancellationToken);
        return types.Select(AgendaTypeDto.From).ToList();
    }
}

/// <summary>Replaces the event's agenda types, preserving ids of kept types (so items keep their link).</summary>
public sealed record SaveAgendaTypesCommand(Guid EventId, IReadOnlyList<AgendaTypeInput> Types)
    : IRequest<IReadOnlyList<AgendaTypeDto>>;

public sealed class SaveAgendaTypesHandler : IRequestHandler<SaveAgendaTypesCommand, IReadOnlyList<AgendaTypeDto>>
{
    private readonly IAppDbContext _db;

    public SaveAgendaTypesHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<AgendaTypeDto>> Handle(SaveAgendaTypesCommand request, CancellationToken cancellationToken)
    {
        var existing = await _db.Set<AgendaType>()
            .Where(t => t.EventId == request.EventId)
            .ToListAsync(cancellationToken);

        var keptIds = request.Types.Where(t => t.Id is not null).Select(t => t.Id!.Value).ToHashSet();
        foreach (var orphan in existing.Where(e => !keptIds.Contains(e.Id)))
        {
            _db.Set<AgendaType>().Remove(orphan);
        }

        var order = 0;
        foreach (var input in request.Types)
        {
            var entity = input.Id is Guid id ? existing.FirstOrDefault(e => e.Id == id) : null;
            if (entity is null)
            {
                entity = new AgendaType { EventId = request.EventId, NamePl = input.NamePl.Trim() };
                _db.Set<AgendaType>().Add(entity);
            }

            entity.NamePl = input.NamePl.Trim();
            entity.NameEn = string.IsNullOrWhiteSpace(input.NameEn) ? null : input.NameEn.Trim();
            entity.Color = string.IsNullOrWhiteSpace(input.Color) ? "#6366f1" : input.Color.Trim();
            entity.Icon = string.IsNullOrWhiteSpace(input.Icon) ? null : input.Icon.Trim();
            entity.Order = order++;
        }

        await _db.SaveChangesAsync(cancellationToken);

        var saved = await _db.Set<AgendaType>().AsNoTracking()
            .Where(t => t.EventId == request.EventId)
            .OrderBy(t => t.Order)
            .ToListAsync(cancellationToken);
        return saved.Select(AgendaTypeDto.From).ToList();
    }
}
