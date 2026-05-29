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

public sealed record ScanResultItem(Guid ClientId, string Status);

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

            db.Set<ScanEvent>().Add(new ScanEvent
            {
                EventId = request.EventId,
                ClientId = item.ClientId,
                Kind = item.Kind,
                ParticipantId = participant.Id,
                StationCode = item.StationCode,
                OccurredAt = item.OccurredAt,
                Online = item.Online,
            });

            ApplyToParticipant(participant, item);

            accepted++;
            results.Add(new ScanResultItem(item.ClientId, "accepted"));
        }

        if (accepted > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            var dashboard = await mediator.Send(new DashboardQuery(request.EventId), cancellationToken);
            await notifier.DashboardChangedAsync(request.EventId, dashboard, cancellationToken);
        }

        return new BatchScanResult(accepted, duplicates, notFound, results);
    }

    // Last-write-wins by device timestamp.
    private static void ApplyToParticipant(Participant participant, ScanInput item)
    {
        switch (item.Kind)
        {
            case ScanKind.CheckIn:
                if (participant.CheckedInAt is null || item.OccurredAt > participant.CheckedInAt)
                {
                    participant.CheckedInAt = item.OccurredAt;
                }

                participant.Status = ParticipantStatus.CheckedIn;
                break;

            case ScanKind.CheckOut:
                if (participant.CheckedOutAt is null || item.OccurredAt > participant.CheckedOutAt)
                {
                    participant.CheckedOutAt = item.OccurredAt;
                }

                participant.Status = ParticipantStatus.CheckedOut;
                break;

            case ScanKind.Station:
                break; // presence only; no status change
        }
    }
}
