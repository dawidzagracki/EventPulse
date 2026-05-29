using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Scanning.Domain;

/// <summary>
/// A recorded scan. <see cref="ClientId"/> is generated on the scanning device and is unique, so
/// re-syncing an offline queue never creates duplicates (idempotent ingestion).
/// </summary>
public sealed class ScanEvent : TenantEntity
{
    public Guid EventId { get; set; }

    /// <summary>Device-generated idempotency key.</summary>
    public Guid ClientId { get; set; }

    public ScanKind Kind { get; set; }
    public Guid ParticipantId { get; set; }
    public string? StationCode { get; set; }

    /// <summary>When the scan happened on the device (may predate server receipt for offline scans).</summary>
    public DateTimeOffset OccurredAt { get; set; }

    /// <summary>False if the scan was captured offline and synced later.</summary>
    public bool Online { get; set; }
}
