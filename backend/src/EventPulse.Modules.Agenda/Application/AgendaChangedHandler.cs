using System.Net;
using EventPulse.Modules.Agenda.Domain;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Agenda.Application;

/// <summary>
/// Notifies every participant of an event when its agenda changes. Runs in the background outbox
/// scope (no tenant context), so it queries by EventId with the tenant filter bypassed.
/// </summary>
public sealed class AgendaChangedHandler : INotificationHandler<AgendaChanged>
{
    private readonly IAppDbContext _db;
    private readonly IEmailSender _email;

    public AgendaChangedHandler(IAppDbContext db, IEmailSender email)
    {
        _db = db;
        _email = email;
    }

    public async Task Handle(AgendaChanged notification, CancellationToken cancellationToken)
    {
        var participants = await _db.Set<Participant>().IgnoreQueryFilters()
            .Where(p => p.EventId == notification.EventId)
            .ToListAsync(cancellationToken);

        foreach (var participant in participants)
        {
            await _email.SendAsync(Build(participant, notification), cancellationToken);
        }
    }

    private static EmailMessage Build(Participant participant, AgendaChanged change)
    {
        var isEn = participant.Language.Equals("en", StringComparison.OrdinalIgnoreCase);
        var title = WebUtility.HtmlEncode(isEn ? change.TitleEn : change.TitlePl);
        var ev = WebUtility.HtmlEncode(change.EventName);

        var subject = isEn ? $"Agenda update: {change.EventName}" : $"Zmiana w agendzie: {change.EventName}";
        var verb = (isEn, change.ChangeType) switch
        {
            (true, AgendaChangeType.Created) => "added",
            (true, AgendaChangeType.Removed) => "removed",
            (true, _) => "changed",
            (false, AgendaChangeType.Created) => "dodany",
            (false, AgendaChangeType.Removed) => "usunięty",
            (false, _) => "zmieniony",
        };

        var line = isEn
            ? $"The agenda of <strong>{ev}</strong> changed: \"{title}\" was {verb}."
            : $"Agenda wydarzenia <strong>{ev}</strong> uległa zmianie: punkt \"{title}\" został {verb}.";

        var html = $"""<div style="font-family:Arial,sans-serif"><p>{line}</p></div>""";
        return new EmailMessage(participant.Email, $"{participant.FirstName} {participant.LastName}", subject, html);
    }
}
