using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Commands;

public sealed record UpdateParticipantStatusCommand(Guid Id, ParticipantStatus Status) : IRequest<ParticipantDto>;

public sealed class UpdateParticipantStatusHandler : IRequestHandler<UpdateParticipantStatusCommand, ParticipantDto>
{
    private readonly IAppDbContext _db;

    public UpdateParticipantStatusHandler(IAppDbContext db) => _db = db;

    public async Task<ParticipantDto> Handle(UpdateParticipantStatusCommand request, CancellationToken cancellationToken)
    {
        var participant = await _db.Set<Participant>()
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Participant not found.");

        participant.Status = request.Status;
        await _db.SaveChangesAsync(cancellationToken);
        return ParticipantDto.From(participant);
    }
}
