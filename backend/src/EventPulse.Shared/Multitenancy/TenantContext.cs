namespace EventPulse.Shared.Multitenancy;

/// <summary>Scoped, mutable tenant holder. Set exactly once per request by the resolution middleware.</summary>
public sealed class TenantContext : ITenantContext
{
    public Guid TenantId { get; private set; } = Guid.Empty;

    public bool IsResolved { get; private set; }

    public void SetTenant(Guid tenantId)
    {
        TenantId = tenantId;
        IsResolved = true;
    }
}
