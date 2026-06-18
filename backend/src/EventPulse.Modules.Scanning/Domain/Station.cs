using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Scanning.Domain;

/// <summary>
/// A named scanning point defined per event ("dodanie stanowiska w aplikacji"). Scans carry the
/// station's <see cref="Name"/> as their <c>StationCode</c>, which is how limits and dashboard
/// aggregation are matched. Free-text codes still work for ad-hoc stations.
/// </summary>
public sealed class Station : TenantEntity
{
    public Guid EventId { get; set; }
    public int Order { get; set; }

    public required string Name { get; set; }
    public string? NameEn { get; set; }
    public string? Icon { get; set; }

    /// <summary>Max scans per participant at this station. 0 = unlimited (e.g. "2 beers").</summary>
    public int ScanLimitPerParticipant { get; set; }

    /// <summary>True = an entry/exit gate (scan flips check-in/out); false = a presence station (e.g. bar).</summary>
    public bool CountsAsCheckIn { get; set; }

    /// <summary>Whether participants may self-scan this station from their app (two-way scanning).</summary>
    public bool AllowSelfScan { get; set; } = true;

    public bool Active { get; set; } = true;
}
