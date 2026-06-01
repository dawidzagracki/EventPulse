using EventPulse.Modules.Participants.Domain;
using EventPulse.Modules.Scanning.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Scanning.Application;

public sealed record RecentCheckIn(string Name, DateTimeOffset At);

public sealed record StationActivity(string Code, int Count);

public sealed record DashboardDto(
    int Total,
    int Invited,
    int Confirmed,
    int CheckedIn,
    int CheckedOut,
    int NoShow,
    double AttendancePct,
    IReadOnlyList<RecentCheckIn> RecentCheckIns,
    IReadOnlyList<StationActivity> Stations);

public sealed record DashboardQuery(Guid EventId) : IRequest<DashboardDto>;

public sealed class DashboardHandler(IAppDbContext db) : IRequestHandler<DashboardQuery, DashboardDto>
{
    public async Task<DashboardDto> Handle(DashboardQuery request, CancellationToken cancellationToken)
    {
        var participants = await db.Set<Participant>().AsNoTracking()
            .Where(p => p.EventId == request.EventId)
            .Select(p => new { p.FirstName, p.LastName, p.Status, p.CheckedInAt })
            .ToListAsync(cancellationToken);

        var total = participants.Count;
        var checkedIn = participants.Count(p => p.CheckedInAt is not null);

        var recent = participants
            .Where(p => p.CheckedInAt is not null)
            .OrderByDescending(p => p.CheckedInAt)
            .Take(5)
            .Select(p => new RecentCheckIn($"{p.FirstName} {p.LastName}", p.CheckedInAt!.Value))
            .ToList();

        var stationRows = await db.Set<ScanEvent>().AsNoTracking()
            .Where(s => s.EventId == request.EventId && s.StationCode != null)
            .GroupBy(s => s.StationCode!)
            .Select(g => new { Code = g.Key, Count = g.Count() })
            .OrderByDescending(s => s.Count)
            .Take(6)
            .ToListAsync(cancellationToken);
        var stations = stationRows.Select(r => new StationActivity(r.Code, r.Count)).ToList();

        return new DashboardDto(
            Total: total,
            Invited: participants.Count(p => p.Status == ParticipantStatus.Invited),
            Confirmed: participants.Count(p => p.Status == ParticipantStatus.Confirmed),
            CheckedIn: checkedIn,
            CheckedOut: participants.Count(p => p.Status == ParticipantStatus.CheckedOut),
            NoShow: participants.Count(p => p.Status == ParticipantStatus.NoShow),
            AttendancePct: total == 0 ? 0 : Math.Round(checkedIn * 100.0 / total, 1),
            RecentCheckIns: recent,
            Stations: stations);
    }
}
