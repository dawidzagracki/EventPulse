using System.Text.Json;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Shared.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EventPulse.Infrastructure.Outbox;

public interface IOutboxDispatcher
{
    Task<int> ProcessPendingAsync(int batchSize = 50, CancellationToken cancellationToken = default);
}

/// <summary>Reads unprocessed outbox rows, republishes them via MediatR, and marks them done.</summary>
public sealed class OutboxDispatcher : IOutboxDispatcher
{
    private readonly AppDbContext _db;
    private readonly IPublisher _publisher;
    private readonly ILogger<OutboxDispatcher> _logger;

    public OutboxDispatcher(AppDbContext db, IPublisher publisher, ILogger<OutboxDispatcher> logger)
    {
        _db = db;
        _publisher = publisher;
        _logger = logger;
    }

    public async Task<int> ProcessPendingAsync(int batchSize = 50, CancellationToken cancellationToken = default)
    {
        var pending = await _db.Set<OutboxMessage>()
            .Where(m => m.ProcessedAt == null)
            .OrderBy(m => m.OccurredAt)
            .Take(batchSize)
            .ToListAsync(cancellationToken);

        var processed = 0;
        foreach (var message in pending)
        {
            try
            {
                var type = Type.GetType(message.Type)
                    ?? throw new InvalidOperationException($"Unknown outbox type '{message.Type}'.");
                var domainEvent = (IDomainEvent)JsonSerializer.Deserialize(message.Content, type)!;

                await _publisher.Publish(domainEvent, cancellationToken);
                message.ProcessedAt = DateTimeOffset.UtcNow;
                processed++;
            }
            catch (Exception ex)
            {
                message.Attempts++;
                message.Error = ex.Message;
                _logger.LogError(ex, "Failed to dispatch outbox message {MessageId}", message.Id);
            }
        }

        if (pending.Count > 0)
        {
            await _db.SaveChangesAsync(cancellationToken);
        }

        return processed;
    }
}
