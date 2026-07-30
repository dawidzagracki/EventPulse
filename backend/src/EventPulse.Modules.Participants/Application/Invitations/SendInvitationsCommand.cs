using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Invitations;

/// <summary>
/// Sends each guest their invitation — which is a PAIR of mails: one with the button that opens the
/// app, one carrying the QR code. They are separate on purpose: at the door a guest searches their
/// inbox for the code, and a mail whose only job is to hold that code is far easier to find than a
/// QR buried inside an invitation.
/// </summary>
/// <param name="ParticipantIds">
/// Null sends to every eligible guest; a list narrows it to those, which is how the per-guest
/// "Wyślij zaproszenie" button reuses this exact path.
/// </param>
public sealed record SendInvitationsCommand(
    Guid EventId,
    string EventName,
    DateTimeOffset EventStartsAt,
    string LinkBaseUrl,
    bool OnlyNotInvited,
    EmailBrand? Brand = null,
    string? Location = null,
    IReadOnlyList<Guid>? ParticipantIds = null)
    : IRequest<SendInvitationsResult>;

/// <summary>Counted per GUEST, not per mail: a guest counts as sent only when both mails went out.</summary>
public sealed record SendInvitationsResult(int SentCount, int FailedCount);

public sealed class SendInvitationsHandler : IRequestHandler<SendInvitationsCommand, SendInvitationsResult>
{
    private readonly IAppDbContext _db;
    private readonly IEmailSender _email;

    public SendInvitationsHandler(IAppDbContext db, IEmailSender email)
    {
        _db = db;
        _email = email;
    }

    public async Task<SendInvitationsResult> Handle(SendInvitationsCommand request, CancellationToken cancellationToken)
    {
        // Only primary guests with an e-mail get invitations (accompanying persons have neither).
        var query = _db.Set<Participant>()
            .Where(p => p.EventId == request.EventId && p.ParentParticipantId == null && p.Email != null);

        if (request.ParticipantIds is { Count: > 0 })
        {
            // An explicit pick is the organiser acting on one guest, so entry-only is respected as a
            // deliberate choice rather than a rule — unlike the bulk send below.
            var ids = request.ParticipantIds;
            query = query.Where(p => ids.Contains(p.Id));
        }
        else
        {
            // Entry-only guests are skipped in a bulk send: they are not meant to be pushed at the app.
            query = query.Where(p => !p.EntryOnly);
        }

        if (request.OnlyNotInvited)
        {
            query = query.Where(p => p.Status == ParticipantStatus.Invited);
        }

        var participants = await query.ToListAsync(cancellationToken);
        if (participants.Count == 0)
        {
            return new SendInvitationsResult(0, 0);
        }

        var sent = 0;
        var failed = 0;
        foreach (var participant in participants)
        {
            var link = $"{request.LinkBaseUrl.TrimEnd('/')}/{participant.AccessToken}";
            var pair = new List<EmailMessage>
            {
                InvitationEmail.Build(participant, request.EventName, request.EventStartsAt, link, request.Brand),
                EntryQrEmail.Build(
                    participant, request.EventName, request.EventStartsAt, request.Location, link, request.Brand),
            };

            // One connection for the guest's pair; a half-delivered guest counts as failed, because
            // reporting them as "sent" would hide a missing QR code.
            var result = await _email.SendManyAsync(pair, cancellationToken);
            if (result.Failed == 0)
            {
                sent++;
            }
            else
            {
                failed++;
            }
        }

        return new SendInvitationsResult(sent, failed);
    }
}
