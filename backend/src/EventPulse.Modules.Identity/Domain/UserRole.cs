namespace EventPulse.Modules.Identity.Domain;

/// <summary>Roles for agency staff. End clients use a separate principal type (<see cref="ClientUser"/>).</summary>
public enum UserRole
{
    /// <summary>Agency super admin / admin — full access within the tenant.</summary>
    Admin = 0,

    /// <summary>On-site agency staff — scanning, live dashboard, assigned tasks.</summary>
    EventStaff = 1,
}
