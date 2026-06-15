using EventPulse.Modules.Identity.Domain;

namespace EventPulse.Modules.Identity.Application.Team;

/// <summary>Agency staff member (super admin or on-site staff).</summary>
public sealed record AdminDto(Guid Id, string Email, string DisplayName, string Role, bool IsActive, DateTimeOffset CreatedAt)
{
    public static AdminDto From(User u) => new(u.Id, u.Email, u.DisplayName, u.Role.ToString(), u.IsActive, u.CreatedAt);
}

/// <summary>End client (mini-admin of one event). May not have set a password yet.</summary>
public sealed record ClientDto(Guid Id, string Email, string DisplayName, bool IsActive, bool IsActivated, DateTimeOffset CreatedAt)
{
    public static ClientDto From(ClientUser c) => new(c.Id, c.Email, c.DisplayName, c.IsActive, c.IsActivated, c.CreatedAt);
}
