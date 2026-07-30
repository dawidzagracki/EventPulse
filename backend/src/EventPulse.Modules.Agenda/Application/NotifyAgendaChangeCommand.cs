using EventPulse.Modules.Agenda.Domain;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Notifications;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Agenda.Application;

/// <summary>
/// Mails every guest the current agenda — on demand, from the "Powiadom uczestników o zmianach"
/// button. Agenda edits themselves send nothing: editing ten items used to mean ten mail waves to
/// the whole guest list.
/// </summary>
public sealed record NotifyAgendaChangeCommand(
    Guid EventId,
    string EventName,
    string LinkBaseUrl,
    EmailBrand? Brand = null) : IRequest<NotifyAgendaResult>;

public sealed record NotifyAgendaResult(int SentCount, int FailedCount);

public sealed class NotifyAgendaChangeHandler : IRequestHandler<NotifyAgendaChangeCommand, NotifyAgendaResult>
{
    private readonly IAppDbContext _db;
    private readonly IEmailSender _email;

    public NotifyAgendaChangeHandler(IAppDbContext db, IEmailSender email)
    {
        _db = db;
        _email = email;
    }

    public async Task<NotifyAgendaResult> Handle(NotifyAgendaChangeCommand request, CancellationToken cancellationToken)
    {
        var items = await _db.Set<AgendaItem>()
            .Where(i => i.EventId == request.EventId)
            .OrderBy(i => i.StartsAt)
            .ToListAsync(cancellationToken);

        if (items.Count == 0)
        {
            throw new ConflictException("The agenda is empty — there is nothing to notify about yet.");
        }

        // Same recipient rule as the invitation send: accompanying persons have no e-mail of their
        // own, and someone who declined isn't coming. Entry-only guests DO get this — a change to
        // the coach or dinner time matters to them just as much.
        var participants = await _db.Set<Participant>()
            .Where(p => p.EventId == request.EventId
                && p.ParentParticipantId == null
                && p.Email != null
                && p.Status != ParticipantStatus.Declined)
            .ToListAsync(cancellationToken);

        if (participants.Count == 0)
        {
            throw new ConflictException("No guest on this event has an e-mail address to notify.");
        }

        var mails = new List<EmailMessage>();
        foreach (var participant in participants)
        {
            // Group-scoped items are only for their group — the same rule the participant app uses.
            var forGuest = items
                .Where(i => i.GroupName == null || i.GroupName == participant.GroupName)
                .ToList();
            if (forGuest.Count == 0)
            {
                continue;
            }

            var link = $"{request.LinkBaseUrl.TrimEnd('/')}/{participant.AccessToken}";
            mails.Add(AgendaUpdateEmail.Build(participant, request.EventName, forGuest, link, request.Brand));
        }

        // One connection for the whole run; failures are still counted per recipient, so one bad
        // address cannot stop the rest.
        var result = await _email.SendManyAsync(mails, cancellationToken);
        return new NotifyAgendaResult(result.Sent, result.Failed);
    }
}
