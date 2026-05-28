namespace EventPulse.Shared.Domain;

/// <summary>Tenant-scoped aggregate root that records domain events for in-process dispatch.</summary>
public abstract class AggregateRoot : TenantEntity
{
    private readonly List<IDomainEvent> _domainEvents = [];

    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    protected void Raise(IDomainEvent domainEvent) => _domainEvents.Add(domainEvent);

    public void ClearDomainEvents() => _domainEvents.Clear();
}
