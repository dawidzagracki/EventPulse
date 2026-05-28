using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Identity.Domain;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Auth;

/// <summary>Exchanges the long-lived participant access token (from the QR/email link) for a JWT.</summary>
public sealed record ParticipantLoginCommand(Guid Token) : IRequest<ParticipantLoginResult>;

public sealed record ParticipantLoginResult(
    string AccessToken,
    DateTimeOffset AccessExpiresAt,
    Guid ParticipantId,
    Guid EventId,
    string FirstName,
    string LastName,
    string Language);

public sealed class ParticipantLoginHandler : IRequestHandler<ParticipantLoginCommand, ParticipantLoginResult>
{
    private readonly IAppDbContext _db;
    private readonly ITokenService _tokens;

    public ParticipantLoginHandler(IAppDbContext db, ITokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    public async Task<ParticipantLoginResult> Handle(ParticipantLoginCommand request, CancellationToken cancellationToken)
    {
        // Unauthenticated: no tenant resolved yet, so bypass the tenant filter.
        var participant = await _db.Set<Participant>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.AccessToken == request.Token, cancellationToken)
            ?? throw new UnauthorizedAppException("Invalid participant token.");

        var (token, expiresAt) = _tokens.CreateAccessToken(
            participant.Id,
            PrincipalType.Participant,
            participant.TenantId,
            participant.Email,
            role: null,
            eventId: participant.EventId);

        if (participant.Status == ParticipantStatus.Invited)
        {
            participant.Status = ParticipantStatus.Activated;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return new ParticipantLoginResult(
            token, expiresAt, participant.Id, participant.EventId,
            participant.FirstName, participant.LastName, participant.Language);
    }
}
