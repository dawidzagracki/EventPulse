namespace EventPulse.Shared.Domain;

/// <summary>A record of a write command executed against the system (auth + payload).</summary>
public sealed class AuditLog : TenantEntity
{
    public Guid? UserId { get; set; }
    public string? PrincipalType { get; set; }

    /// <summary>
    /// The actor's login, captured at write time. An audit trail has to be an immutable snapshot of
    /// who acted — resolving UserId later breaks for operators (their principal id matches no row)
    /// and for anyone renamed or removed since.
    /// </summary>
    public string? ActorEmail { get; set; }
    public required string Action { get; set; }
    public string? Payload { get; set; }
}
