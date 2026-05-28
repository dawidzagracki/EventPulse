using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Invitations;

public sealed record SendInvitationsCommand(Guid EventId, string EventName, string LinkBaseUrl, bool OnlyNotInvited)
    : IRequest<SendInvitationsResult>;

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
        var query = _db.Set<Participant>().Where(p => p.EventId == request.EventId);
        if (request.OnlyNotInvited)
        {
            query = query.Where(p => p.Status == ParticipantStatus.Invited);
        }

        var participants = await query.ToListAsync(cancellationToken);

        var sent = 0;
        var failed = 0;
        foreach (var participant in participants)
        {
            var link = $"{request.LinkBaseUrl.TrimEnd('/')}/{participant.AccessToken}";
            var message = InvitationEmail.Build(participant, request.EventName, link);

            try
            {
                await _email.SendAsync(message, cancellationToken);
                sent++;
            }
            catch
            {
                failed++; // best-effort; a real run would use the outbox + retries
            }
        }

        return new SendInvitationsResult(sent, failed);
    }
}
