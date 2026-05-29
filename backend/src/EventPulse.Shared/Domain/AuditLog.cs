namespace EventPulse.Shared.Domain;

/// <summary>A record of a write command executed against the system (auth + payload).</summary>
public sealed class AuditLog : TenantEntity
{
    public Guid? UserId { get; set; }
    public string? PrincipalType { get; set; }
    public required string Action { get; set; }
    public string? Payload { get; set; }
}
