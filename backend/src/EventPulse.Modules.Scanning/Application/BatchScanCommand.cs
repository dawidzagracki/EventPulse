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

        // Stations with a per-participant cap (e.g. "2 beers"), keyed by their name (= scan code).
        var limitedStations = await db.Set<Station>().AsNoTracking()
            .Where(s => s.EventId == request.EventId && s.ScanLimitPerParticipant > 0)
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

            // Per-station cap: reject once the participant hit the limit (e.g. their 3rd beer).
            var code = item.StationCode?.Trim();
            if (!string.IsNullOrEmpty(code) && limitedStations.TryGetValue(code, out var limit))
            {
                var key = (participant.Id, code);
                var priorDb = await db.Set<ScanEvent>().CountAsync(
                    s => s.EventId == request.EventId && s.ParticipantId == participant.Id && s.StationCode == code,
                    cancellationToken);
                var priorBatch = batchStationCounts.GetValueOrDefault(key);
                if (priorDb + priorBatch >= limit)
                {
                    results.Add(new ScanResultItem(
                        item.ClientId, "limit",
                        Name: $"{participant.FirstName} {participant.LastName}".Trim()));
                    continue;
                }

                batchStationCounts[key] = priorBatch + 1;
            }

            // Capture the prior state BEFORE mutating, so the operator can be warned
            // about re-entries ("already checked in at 17:32").
            var alreadyCheckedIn = item.Kind == ScanKind.CheckIn && participant.CheckedInAt is not null;
            var previousAt = item.Kind == ScanKind.CheckOut ? participant.CheckedOutAt : participant.CheckedInAt;

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
                "accepted",
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

                participant.Status = ParticipantStatus.CheckedOut;
                break;

            case ScanKind.Station:
                break; // presence only; no status change
        }
    }
}
