using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Identity.Domain;

/// <summary>An agency (the unit of multi-tenancy). Its <see cref="Entity.Id"/> is the TenantId used everywhere.</summary>
public sealed class Tenant : Entity, IAuditable
{
    public required string Name { get; set; }
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}
