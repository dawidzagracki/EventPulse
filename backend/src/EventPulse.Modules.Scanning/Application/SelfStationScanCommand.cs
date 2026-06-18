using EventPulse.Modules.Scanning.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Scanning.Application;

/// <summary>
/// A guest self-records their presence at a station they scanned with their phone
/// (spec §3.2). Idempotent by device ClientId. Returns the resolved station label.
/// </summary>
public sealed record SelfStationScanCommand(
    Guid EventId,
    Guid ParticipantId,
    string StationCode,
    Guid ClientId,
    DateTimeOffset OccurredAt) : IRequest<SelfStationScanResult>;

public sealed record SelfStationScanResult(string StationCode, bool Duplicate, bool LimitReached = false, bool Allowed = true);

public sealed class SelfStationScanHandler(IAppDbContext db) : IRequestHandler<SelfStationScanCommand, SelfStationScanResult>
{
    public async Task<SelfStationScanResult> Handle(SelfStationScanCommand request, CancellationToken cancellationToken)
    {
        var station = request.StationCode.Trim();

        var exists = await db.Set<ScanEvent>()
            .AnyAsync(s => s.ClientId == request.ClientId, cancellationToken);
        if (exists)
        {
            return new SelfStationScanResult(station, Duplicate: true);
        }

        // Respect the defined station's self-scan flag and per-participant limit.
        var defined = await db.Set<Station>().AsNoTracking()
            .FirstOrDefaultAsync(s => s.EventId == request.EventId && s.Name == station, cancellationToken);
        if (defined is not null)
        {
            if (!defined.AllowSelfScan)
            {
                return new SelfStationScanResult(station, Duplicate: false, Allowed: false);
            }

            if (defined.ScanLimitPerParticipant > 0)
            {
                var prior = await db.Set<ScanEvent>().CountAsync(
                    s => s.EventId == request.EventId && s.ParticipantId == request.ParticipantId && s.StationCode == station,
                    cancellationToken);
                if (prior >= defined.ScanLimitPerParticipant)
                {
                    return new SelfStationScanResult(station, Duplicate: false, LimitReached: true);
                }
            }
        }

        db.Set<ScanEvent>().Add(new ScanEvent
        {
            EventId = request.EventId,
            ClientId = request.ClientId,
            Kind = ScanKind.Station,
            ParticipantId = request.ParticipantId,
            StationCode = station,
            OccurredAt = request.OccurredAt.ToUniversalTime(), // timestamptz requires UTC
            Online = true,
        });
        await db.SaveChangesAsync(cancellationToken);

        return new SelfStationScanResult(station, Duplicate: false);
    }
}
