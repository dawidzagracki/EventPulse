using EventPulse.Modules.Participants.Domain;
using EventPulse.Modules.Scanning.Domain;
using EventPulse.Shared.Notifications;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Scanning.Application;

public sealed record ScanInput(
    Guid ClientId,
    Guid ParticipantToken,
    ScanKind Kind,
    DateTimeOffset OccurredAt,
    string? StationCode,
    bool Online);

public sealed record BatchScanCommand(Guid EventId, IReadOnlyList<ScanInput> Items) : IRequest<BatchScanResult>;

public sealed record ScanResultItem(
    Guid ClientId,
    string Status,
    string? Name = null,
    int? ParticipantStatus = null,
    string? TableName = null,
    string? RoomNumber = null,
    string? Dietary = null,
    bool AlreadyCheckedIn = false,
    DateTimeOffset? PreviousAt = null);

public sealed record BatchScanResult(int Accepted, int Duplicates, int NotFound, IReadOnlyList<ScanResultItem> Items);

public sealed class BatchScanHandler(IAppDbContext db, ISender mediator, IEventNotifier notifier)
    : IRequestHandler<BatchScanCommand, BatchScanResult>
{
    public async Task<BatchScanResult> Handle(BatchScanCommand request, CancellationToken cancellationToken)
    {
        var clientIds = request.Items.Select(i => i.ClientId).ToList();
        var existing = await db.Set<ScanEvent>()
            .Where(s => clientIds.Contains(s.ClientId))
            .Select(s => s.ClientId)
            .ToListAsync(cancellationToken);
        var seen = existing.ToHashSet();

        // Every station of the event, keyed by name (= scan code), so a code with no row can be told
        // apart from one configured as unlimited. See ResolveStationCap.
        var stationCaps = await db.Set<Station>().AsNoTracking()
            .Where(s => s.EventId == request.EventId)
            .ToDictionaryAsync(s => s.Name, s => s.ScanLimitPerParticipant, StringComparer.OrdinalIgnoreCase, cancellationToken);
        var batchStationCounts = new Dictionary<(Guid, string), int>();

        var results = new List<ScanResultItem>();
        var accepted = 0;
        var duplicates = 0;
        var notFound = 0;

        foreach (var item in request.Items)
        {
            if (!seen.Add(item.ClientId))
            {
                duplicates++;
                results.Add(new ScanResultItem(item.ClientId, "duplicate"));
                continue;
            }

            var participant = await db.Set<Participant>()
                .FirstOrDefaultAsync(
                    p => p.EventId == request.EventId && p.AccessToken == item.ParticipantToken,
                    cancellationToken);

            if (participant is null)
            {
                notFound++;
                results.Add(new ScanResultItem(item.ClientId, "notfound"));
                continue;
            }

            // Per-station cap. A presence point nobody configured counts each guest once, so
            // accidentally re-scanning someone onto the same coach stays a single scan.
            var code = item.StationCode?.Trim();
            var cap = ResolveStationCap(item.Kind, code, stationCaps);
            if (cap is not null && !string.IsNullOrEmpty(code))
            {
                var key = (participant.Id, code);
                var priorScans = await db.Set<ScanEvent>()
                    .Where(s => s.EventId == request.EventId && s.ParticipantId == participant.Id && s.StationCode == code)
                    .Select(s => s.OccurredAt)
                    .ToListAsync(cancellationToken);
                var priorBatch = batchStationCounts.GetValueOrDefault(key);
                if (priorScans.Count + priorBatch >= cap)
                {
                    // A repeat at a once-per-guest point is information, not a misconfiguration:
                    // tell the operator when this person was first recorded here and move on.
                    var repeat = cap == 1;
                    results.Add(new ScanResultItem(
                        item.ClientId,
                        repeat ? "already" : "limit",
                        Name: $"{participant.FirstName} {participant.LastName}".Trim(),
                        PreviousAt: priorScans.Count > 0 ? priorScans.Min() : null));
                    continue;
                }

                batchStationCounts[key] = priorBatch + 1;
            }

            // Capture the prior state BEFORE mutating, so the operator can be warned
            // about re-entries ("already checked in at 17:32").
            var alreadyCheckedIn = item.Kind == ScanKind.CheckIn && participant.CheckedInAt is not null;
            var previousAt = item.Kind == ScanKind.CheckOut ? participant.CheckedOutAt : participant.CheckedInAt;
            // Checking someone OUT who was never checked IN almost always means the operator has
            // the wrong mode selected. Flag it instead of reporting a cheerful success.
            var checkOutWithoutCheckIn = item.Kind == ScanKind.CheckOut && participant.CheckedInAt is null;

            var occurredAt = item.OccurredAt.ToUniversalTime(); // timestamptz requires UTC

            db.Set<ScanEvent>().Add(new ScanEvent
            {
                EventId = request.EventId,
                ClientId = item.ClientId,
                Kind = item.Kind,
                ParticipantId = participant.Id,
                StationCode = item.StationCode,
                OccurredAt = occurredAt,
                Online = item.Online,
            });

            ApplyToParticipant(participant, occurredAt, item.Kind);

            accepted++;
            results.Add(new ScanResultItem(
                item.ClientId,
                checkOutWithoutCheckIn ? "nocheckin" : "accepted",
                Name: $"{participant.FirstName} {participant.LastName}".Trim(),
                ParticipantStatus: (int)participant.Status,
                TableName: participant.TableName,
                RoomNumber: participant.RoomNumber,
                Dietary: participant.DietaryPreferences,
                AlreadyCheckedIn: alreadyCheckedIn,
                PreviousAt: previousAt));
        }

        if (accepted > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            var dashboard = await mediator.Send(new DashboardQuery(request.EventId), cancellationToken);
            await notifier.DashboardChangedAsync(request.EventId, dashboard, cancellationToken);
        }

        return new BatchScanResult(accepted, duplicates, notFound, results);
    }

    /// <summary>
    /// How many times one guest may be scanned at a code. Only presence scans are capped — the doors
    /// keep every check-in/out as an audit trail, and attendance is keyed on CheckedInAt anyway.
    /// A configured station keeps its own meaning (0 = unlimited, N = N); a code with no station row
    /// — an agenda checkpoint or an ad-hoc code — counts each guest exactly once.
    /// </summary>
    private static int? ResolveStationCap(ScanKind kind, string? code, IReadOnlyDictionary<string, int> stationCaps)
    {
        if (kind != ScanKind.Station || string.IsNullOrEmpty(code))
        {
            return null;
        }

        if (!stationCaps.TryGetValue(code, out var configured))
        {
            return 1;
        }

        return configured > 0 ? configured : null; // 0 stays "unlimited"
    }

    // Last-write-wins by device timestamp (UTC-normalized by the caller).
    private static void ApplyToParticipant(Participant participant, DateTimeOffset occurredAt, ScanKind kind)
    {
        switch (kind)
        {
            case ScanKind.CheckIn:
                if (participant.CheckedInAt is null || occurredAt > participant.CheckedInAt)
                {
                    participant.CheckedInAt = occurredAt;
                }

                participant.Status = ParticipantStatus.CheckedIn;
                break;

            case ScanKind.CheckOut:
                if (participant.CheckedOutAt is null || occurredAt > participant.CheckedOutAt)
                {
                    participant.CheckedOutAt = occurredAt;
                }

                // Only move to CheckedOut for someone who actually checked in. Otherwise the guest
                // would count as neither attending (attendance is keyed on CheckedInAt) nor absent
                // (MarkNoShows skips CheckedOut) and would vanish from every report.
                if (participant.CheckedInAt is not null)
                {
                    participant.Status = ParticipantStatus.CheckedOut;
                }

                break;

            case ScanKind.Station:
                break; // presence only; no status change
        }
    }
}
