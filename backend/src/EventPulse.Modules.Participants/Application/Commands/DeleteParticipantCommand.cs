using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Commands;

/// <summary>
/// Removes a participant from an event's guest list, together with their accompanying
/// persons (plus-ones). Scoped by both event id and the tenant query filter. Historical
/// records in other modules (scans, feedback, quiz results) keep their loose participant
/// Guid — same posture as anonymization: stats survive, the person is gone.
/// </summary>
public sealed record DeleteParticipantCommand(Guid EventId, Guid ParticipantId) : IRequest<Unit>;

public sealed class DeleteParticipantHandler : IRequestHandler<DeleteParticipantCommand, Unit>
{
    private readonly IAppDbContext _db;

    public DeleteParticipantHandler(IAppDbContext db) => _db = db;

    public async Task<Unit> Handle(DeleteParticipantCommand request, CancellationToken cancellationToken)
    {
        var participant = await _db.Set<Participant>()
            .FirstOrDefaultAsync(p => p.Id == request.ParticipantId && p.EventId == request.EventId, cancellationToken)
            ?? throw new NotFoundException("Participant not found.");

        // Plus-ones belong to their parent — remove them together.
        var companions = await _db.Set<Participant>()
            .Where(p => p.ParentParticipantId == participant.Id)
            .ToListAsync(cancellationToken);

        _db.Set<Participant>().RemoveRange(companions);
        _db.Set<Participant>().Remove(participant);
        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
