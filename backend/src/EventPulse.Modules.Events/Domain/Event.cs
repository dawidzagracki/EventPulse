using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Events.Domain;

/// <summary>
/// The root aggregate of the system. Almost every other entity references an event via EventId.
/// Tenant-scoped: an event always belongs to exactly one agency (tenant).
/// </summary>
public sealed class Event : AggregateRoot
{
    public required string Name { get; set; }

    /// <summary>URL slug, globally unique across all tenants (shared public domain).</summary>
    public required string Slug { get; set; }

    public EventStatus Status { get; set; } = EventStatus.Draft;

    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }

    public string? Location { get; set; }
    public string? Description { get; set; }

    /// <summary>Default UI language for the event: "pl" or "en".</summary>
    public string DefaultLanguage { get; set; } = "pl";

    /// <summary>Email of the end client (mini-admin) who edits this event.</summary>
    public string? ClientEmail { get; set; }
}
