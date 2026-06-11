using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Me;

/// <summary>Participant RSVP: confirm attendance or decline (spec §3.2). Ignored once checked in.</summary>
public sealed record RsvpCommand(Guid ParticipantId, bool Attending) : IRequest<MyProfileDto>;

public sealed class RsvpHandler : IRequestHandler<RsvpCommand, MyProfileDto>
{
    private readonly IAppDbContext _db;

    public RsvpHandler(IAppDbContext db) => _db = db;

    public async Task<MyProfileDto> Handle(RsvpCommand request, CancellationToken cancellationToken)
    {
        var participant = await _db.Set<Participant>()
            .FirstOrDefaultAsync(p => p.Id == request.ParticipantId, cancellationToken)
            ?? throw new NotFoundException("Participant not found.");

        // Don't let an RSVP overwrite an on-site state (checked-in/out, no-show).
        if (participant.Status is ParticipantStatus.Invited or ParticipantStatus.Activated
            or ParticipantStatus.Confirmed or ParticipantStatus.Declined)
        {
            participant.Status = request.Attending ? ParticipantStatus.Confirmed : ParticipantStatus.Declined;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return MyProfileDto.From(participant);
    }
}
