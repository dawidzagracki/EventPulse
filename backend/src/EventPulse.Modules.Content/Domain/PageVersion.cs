using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Content.Domain;

/// <summary>An immutable snapshot created on each publish, enabling history and rollback.</summary>
public sealed class PageVersion : TenantEntity
{
    public Guid EventPageId { get; set; }
    public int Version { get; set; }
    public required string Content { get; set; }
    public DateTimeOffset PublishedAt { get; set; }
}
