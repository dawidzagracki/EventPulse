using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Me;

/// <summary>RODO acceptance is mandatory; photo/networking consents are optional.</summary>
public sealed record AcceptConsentsCommand(
    Guid ParticipantId,
    bool RodoAccepted,
    bool PhotoConsent,
    bool NetworkingConsent) : IRequest<MyProfileDto>;

public sealed class AcceptConsentsHandler : IRequestHandler<AcceptConsentsCommand, MyProfileDto>
{
    private readonly IAppDbContext _db;

    public AcceptConsentsHandler(IAppDbContext db) => _db = db;

    public async Task<MyProfileDto> Handle(AcceptConsentsCommand request, CancellationToken cancellationToken)
    {
        if (!request.RodoAccepted)
        {
            throw new ConflictException("RODO consent is required to access the event.");
        }

        var participant = await _db.Set<Participant>()
            .FirstOrDefaultAsync(p => p.Id == request.ParticipantId, cancellationToken)
            ?? throw new NotFoundException("Participant not found.");

        participant.RodoAcceptedAt = DateTimeOffset.UtcNow;
        participant.RodoVersion = RodoPolicy.CurrentVersion;
        participant.PhotoConsent = request.PhotoConsent;
        participant.NetworkingConsent = request.NetworkingConsent;

        await _db.SaveChangesAsync(cancellationToken);
        return MyProfileDto.From(participant);
    }
}
