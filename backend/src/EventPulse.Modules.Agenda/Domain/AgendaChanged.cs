using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Agenda.Domain;

public enum AgendaChangeType
{
    Created = 0,
    Updated = 1,
    Removed = 2,
}

/// <summary>Raised when an agenda item changes; drives participant notifications via the outbox.</summary>
public sealed record AgendaChanged(
    Guid EventId,
    string EventName,
    Guid AgendaItemId,
    AgendaChangeType ChangeType,
    string TitlePl,
    string TitleEn) : IDomainEvent;
