using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Identity.Domain;

/// <summary>
/// A persisted refresh token (stored hashed). Not tenant-filtered: refresh happens without a valid
/// access token, so the lookup must work without a resolved tenant.
/// </summary>
public sealed class RefreshToken : Entity
{
    public Guid PrincipalId { get; set; }
    public PrincipalType PrincipalType { get; set; }
    public Guid TenantId { get; set; }
    public required string TokenHash { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }

    public bool IsActive => RevokedAt is null && ExpiresAt > DateTimeOffset.UtcNow;
}
