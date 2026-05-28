namespace EventPulse.Shared.Domain;

/// <summary>Timestamps maintained automatically by the persistence layer.</summary>
public interface IAuditable
{
    DateTimeOffset CreatedAt { get; set; }
    DateTimeOffset? UpdatedAt { get; set; }
}
