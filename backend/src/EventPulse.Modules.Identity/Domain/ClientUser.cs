using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Identity.Domain;

/// <summary>
/// End client (mini-admin) who edits exactly one agency's event. Password is null until the client
/// activates their account via the emailed link.
/// </summary>
public sealed class ClientUser : TenantEntity
{
    public required string Email { get; set; }
    public string? PasswordHash { get; set; }
    public required string DisplayName { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>SHA-256 of the one-time activation token; cleared once the password is set.</summary>
    public string? ActivationTokenHash { get; set; }
    public DateTimeOffset? ActivationTokenExpiresAt { get; set; }

    public bool IsActivated => PasswordHash is not null;
}
