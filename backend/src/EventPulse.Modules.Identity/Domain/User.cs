using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Identity.Domain;

/// <summary>Agency staff member. Email is globally unique so login works before a tenant is resolved.</summary>
public sealed class User : TenantEntity
{
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public required string DisplayName { get; set; }
    public UserRole Role { get; set; } = UserRole.Admin;
    public bool IsActive { get; set; } = true;
}
