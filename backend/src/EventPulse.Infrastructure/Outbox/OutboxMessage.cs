namespace EventPulse.Infrastructure.Outbox;

/// <summary>
/// A domain event persisted in the same transaction as the change that raised it, then dispatched
/// asynchronously. Guarantees side effects (emails, push) survive crashes and aren't lost.
/// </summary>
public sealed class OutboxMessage
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    /// <summary>Assembly-qualified type name used to rehydrate the event on dispatch.</summary>
    public required string Type { get; set; }

    public required string Content { get; set; }

    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ProcessedAt { get; set; }
    public int Attempts { get; set; }
    public string? Error { get; set; }
}
