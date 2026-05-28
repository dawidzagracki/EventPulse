using MediatR;

namespace EventPulse.Shared.Domain;

/// <summary>A fact that happened in the domain, dispatched in-process via MediatR.</summary>
public interface IDomainEvent : INotification
{
    DateTimeOffset OccurredAt => DateTimeOffset.UtcNow;
}
