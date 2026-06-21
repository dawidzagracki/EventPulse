using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Events.Domain;

/// <summary>
/// Explicit grant that a client account (<c>ClientUserId</c>, owned by the Identity module) may
/// access this event. Models a many-to-many between <see cref="Event"/> and the Identity ClientUser.
/// Stored as bare ids so the Events module stays decoupled from Identity — the API layer and the
/// front-end resolve the client's name/e-mail from the team list when they need to display it.
/// </summary>
public sealed class EventClientAssignment : TenantEntity
{
    public Guid EventId { get; set; }
    public Guid ClientUserId { get; set; }
}
