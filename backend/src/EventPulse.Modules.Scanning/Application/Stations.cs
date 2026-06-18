using EventPulse.Modules.Scanning.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Scanning.Application;

public sealed record StationDto(
    Guid Id,
    string Name,
    string? NameEn,
    string? Icon,
    int ScanLimitPerParticipant,
    bool CountsAsCheckIn,
    bool AllowSelfScan,
    bool Active,
    int Order)
{
    public static StationDto From(Station s) => new(
        s.Id, s.Name, s.NameEn, s.Icon, s.ScanLimitPerParticipant, s.CountsAsCheckIn, s.AllowSelfScan, s.Active, s.Order);
}

public sealed record StationInput(
    Guid? Id,
    string Name,
    string? NameEn,
    string? Icon,
    int ScanLimitPerParticipant,
    bool CountsAsCheckIn,
    bool AllowSelfScan,
    bool Active);

/// <summary>Per-station rollup for the "Stanowiska" tab: defined config + live stats.</summary>
public sealed record StationStatDto(
    Guid? Id,
    string Name,
    string? Icon,
    int ScanLimitPerParticipant,
    bool CountsAsCheckIn,
    bool AllowSelfScan,
    bool Active,
    int Scans,
    int People);

// ---- Queries ----

public sealed record ListStationsQuery(Guid EventId) : IRequest<IReadOnlyList<StationDto>>;

public sealed class ListStationsHandler(IAppDbContext db) : IRequestHandler<ListStationsQuery, IReadOnlyList<StationDto>>
{
    public async Task<IReadOnlyList<StationDto>> Handle(ListStationsQuery request, CancellationToken ct)
    {
        var stations = await db.Set<Station>().AsNoTracking()
            .Where(s => s.EventId == request.EventId)
            .OrderBy(s => s.Order)
            .ToListAsync(ct);
        return stations.Select(StationDto.From).ToList();
    }
}

/// <summary>Active stations for the operator scanner (kept lean; reachable via ScannerAccess).</summary>
public sealed record ListActiveStationsQuery(Guid EventId) : IRequest<IReadOnlyList<StationDto>>;

public sealed class ListActiveStationsHandler(IAppDbContext db)
    : IRequestHandler<ListActiveStationsQuery, IReadOnlyList<StationDto>>
{
    public async Task<IReadOnlyList<StationDto>> Handle(ListActiveStationsQuery request, CancellationToken ct)
    {
        var stations = await db.Set<Station>().AsNoTracking()
            .Where(s => s.EventId == request.EventId && s.Active)
            .OrderBy(s => s.Order)
            .ToListAsync(ct);
        return stations.Select(StationDto.From).ToList();
    }
}

/// <summary>Defined stations enriched with scan counts + distinct people (for the dashboard tab).</summary>
public sealed record StationsSummaryQuery(Guid EventId) : IRequest<IReadOnlyList<StationStatDto>>;

public sealed class StationsSummaryHandler(IAppDbContext db) : IRequestHandler<StationsSummaryQuery, IReadOnlyList<StationStatDto>>
{
    public async Task<IReadOnlyList<StationStatDto>> Handle(StationsSummaryQuery request, CancellationToken ct)
    {
        var stations = await db.Set<Station>().AsNoTracking()
            .Where(s => s.EventId == request.EventId)
            .OrderBy(s => s.Order)
            .ToListAsync(ct);

        // Group (code, participant) pairs in memory — Distinct-count doesn't translate in a grouped projection.
        var scanPairs = await db.Set<ScanEvent>().AsNoTracking()
            .Where(s => s.EventId == request.EventId && s.StationCode != null)
            .Select(s => new { Code = s.StationCode!, s.ParticipantId })
            .ToListAsync(ct);
        var scanRows = scanPairs
            .GroupBy(r => r.Code)
            .Select(g => new { Code = g.Key, Scans = g.Count(), People = g.Select(x => x.ParticipantId).Distinct().Count() })
            .ToList();
        var byCode = scanRows.ToDictionary(r => r.Code, StringComparer.OrdinalIgnoreCase);

        var result = new List<StationStatDto>();
        var matched = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var s in stations)
        {
            byCode.TryGetValue(s.Name, out var stat);
            matched.Add(s.Name);
            result.Add(new StationStatDto(
                s.Id, s.Name, s.Icon, s.ScanLimitPerParticipant, s.CountsAsCheckIn, s.AllowSelfScan, s.Active,
                stat?.Scans ?? 0, stat?.People ?? 0));
        }

        // Ad-hoc codes that don't map to a defined station still appear, so nothing is hidden.
        foreach (var row in scanRows.Where(r => !matched.Contains(r.Code)))
        {
            result.Add(new StationStatDto(null, row.Code, null, 0, false, false, true, row.Scans, row.People));
        }

        return result;
    }
}

// ---- Save (replace list, preserving ids) ----

public sealed record SaveStationsCommand(Guid EventId, IReadOnlyList<StationInput> Stations)
    : IRequest<IReadOnlyList<StationDto>>;

public sealed class SaveStationsHandler(IAppDbContext db) : IRequestHandler<SaveStationsCommand, IReadOnlyList<StationDto>>
{
    public async Task<IReadOnlyList<StationDto>> Handle(SaveStationsCommand request, CancellationToken ct)
    {
        var existing = await db.Set<Station>().Where(s => s.EventId == request.EventId).ToListAsync(ct);

        var keptIds = request.Stations.Where(s => s.Id is not null).Select(s => s.Id!.Value).ToHashSet();
        foreach (var orphan in existing.Where(e => !keptIds.Contains(e.Id)))
        {
            db.Set<Station>().Remove(orphan);
        }

        var order = 0;
        foreach (var input in request.Stations)
        {
            var entity = input.Id is Guid id ? existing.FirstOrDefault(e => e.Id == id) : null;
            if (entity is null)
            {
                entity = new Station { EventId = request.EventId, Name = input.Name.Trim() };
                db.Set<Station>().Add(entity);
            }

            entity.Name = input.Name.Trim();
            entity.NameEn = string.IsNullOrWhiteSpace(input.NameEn) ? null : input.NameEn.Trim();
            entity.Icon = string.IsNullOrWhiteSpace(input.Icon) ? null : input.Icon.Trim();
            entity.ScanLimitPerParticipant = Math.Max(0, input.ScanLimitPerParticipant);
            entity.CountsAsCheckIn = input.CountsAsCheckIn;
            entity.AllowSelfScan = input.AllowSelfScan;
            entity.Active = input.Active;
            entity.Order = order++;
        }

        await db.SaveChangesAsync(ct);

        var saved = await db.Set<Station>().AsNoTracking()
            .Where(s => s.EventId == request.EventId)
            .OrderBy(s => s.Order)
            .ToListAsync(ct);
        return saved.Select(StationDto.From).ToList();
    }
}
