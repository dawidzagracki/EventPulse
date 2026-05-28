namespace EventPulse.Shared.Multitenancy;

/// <summary>
/// Carries the current request's tenant (agency). Resolved once per request from the JWT and
/// consumed by the persistence layer's global query filter.
/// </summary>
public interface ITenantContext
{
    /// <summary>Current tenant id, or <see cref="Guid.Empty"/> when unresolved (filter then yields no rows).</summary>
    Guid TenantId { get; }

    bool IsResolved { get; }

    void SetTenant(Guid tenantId);
}
