using EventPulse.Modules.Participants.Domain;
using EventPulse.Modules.Scanning.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Scanning.Application;

/// <summary>One presence scan with the person behind it — "who was at the coach, and when".</summary>
public sealed record StationScanEntryDto(
    string StationCode,
    Guid ParticipantId,
    string ParticipantName,
    DateTimeOffset OccurredAt);

/// <summary>
/// Presence scans for an event, with participant names attached. Kept out of DashboardQuery on
/// purpose: that one is recomputed and broadcast over SignalR on every single scan, so names would
/// bloat the hot path. This is fetched on demand instead.
/// </summary>
public sealed record StationScanLogQuery(Guid EventId) : IRequest<IReadOnlyList<StationScanEntryDto>>;

public sealed class StationScanLogHandler(IAppDbContext db)
    : IRequestHandler<StationScanLogQuery, IReadOnlyList<StationScanEntryDto>>
{
    public async Task<IReadOnlyList<StationScanEntryDto>> Handle(StationScanLogQuery request, CancellationToken ct)
    {
        var scans = await db.Set<ScanEvent>().AsNoTracking()
            .Where(s => s.EventId == request.EventId && s.Kind == ScanKind.Station && s.StationCode != null)
            .Select(s => new { Code = s.StationCode!, s.ParticipantId, s.OccurredAt })
            .ToListAsync(ct);

        if (scans.Count == 0)
        {
            return [];
        }

        var ids = scans.Select(s => s.ParticipantId).Distinct().ToList();
        var names = await db.Set<Participant>().AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .Select(p => new { p.Id, p.FirstName, p.LastName })
            .ToListAsync(ct);
        var byId = names.ToDictionary(p => p.Id, p => $"{p.FirstName} {p.LastName}".Trim());

        return scans
            .OrderBy(s => s.OccurredAt)
            .Select(s => new StationScanEntryDto(
                s.Code,
                s.ParticipantId,
                byId.TryGetValue(s.ParticipantId, out var name) ? name : "—",
                s.OccurredAt))
            .ToList();
    }
}
