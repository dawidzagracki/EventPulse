namespace EventPulse.Shared.Domain;

/// <summary>
/// Base for every tenant-scoped entity. The persistence layer stamps <see cref="TenantId"/> on
/// insert and applies a global query filter so one agency can never read another's data.
/// </summary>
public abstract class TenantEntity : Entity, IAuditable
{
    public Guid TenantId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}
