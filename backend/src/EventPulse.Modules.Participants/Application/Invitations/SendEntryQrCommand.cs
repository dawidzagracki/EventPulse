using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Notifications;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Invitations;

/// <summary>
/// Mails one guest their entry QR code. Used when an entry-only guest is created, and on demand
/// from the participant detail panel — on the event day that "resend the QR" button is the fix for
/// a guest who lost the mail or changed phone.
/// </summary>
public sealed record SendEntryQrCommand(
    Guid EventId,
    Guid ParticipantId,
    string EventName,
    DateTimeOffset EventStartsAt,
    string? Location,
    string LinkBaseUrl,
    EmailBrand? Brand = null) : IRequest<Unit>;

public sealed class SendEntryQrHandler : IRequestHandler<SendEntryQrCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly IEmailSender _email;

    public SendEntryQrHandler(IAppDbContext db, IEmailSender email)
    {
        _db = db;
        _email = email;
    }

    public async Task<Unit> Handle(SendEntryQrCommand request, CancellationToken cancellationToken)
    {
        var participant = await _db.Set<Participant>()
            .FirstOrDefaultAsync(
                p => p.Id == request.ParticipantId && p.EventId == request.EventId, cancellationToken)
            ?? throw new NotFoundException("Participant not found.");

        if (string.IsNullOrWhiteSpace(participant.Email))
        {
            throw new ConflictException("This guest has no e-mail address, so the QR code can't be sent.");
        }

        var message = EntryQrEmail.Build(
            participant,
            request.EventName,
            request.EventStartsAt,
            request.Location,
            BuildLink(request.LinkBaseUrl, participant.AccessToken),
            request.Brand);

        await _email.SendAsync(message, cancellationToken);
        return Unit.Value;
    }

    /// <summary>The QR payload — identical to every other QR in the system (GetParticipantQrQuery).</summary>
    public static string BuildLink(string linkBaseUrl, Guid accessToken)
        => $"{linkBaseUrl.TrimEnd('/')}/{accessToken}";
}
