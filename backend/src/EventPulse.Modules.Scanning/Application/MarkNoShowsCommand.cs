using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Scanning.Application;

/// <summary>Marks participants who never checked in as NoShow (run when an event completes).</summary>
public sealed record MarkNoShowsCommand(Guid EventId) : IRequest<int>;

public sealed class MarkNoShowsHandler(IAppDbContext db) : IRequestHandler<MarkNoShowsCommand, int>
{
    private static readonly ParticipantStatus[] Pending =
        [ParticipantStatus.Invited, ParticipantStatus.Activated, ParticipantStatus.Confirmed];

    public async Task<int> Handle(MarkNoShowsCommand request, CancellationToken cancellationToken)
    {
        var absentees = await db.Set<Participant>()
            .Where(p => p.EventId == request.EventId && p.CheckedInAt == null && Pending.Contains(p.Status))
            .ToListAsync(cancellationToken);

        foreach (var participant in absentees)
        {
            participant.Status = ParticipantStatus.NoShow;
        }

        if (absentees.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        return absentees.Count;
    }
}
