using EventPulse.Modules.Participants.Domain;
using EventPulse.Modules.Scanning.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Scanning.Application;

/// <summary>Arrivals in one 15-minute slot — the shape of the door queue.</summary>
public sealed record ReportBucket(DateTimeOffset At, int Count);

/// <summary>A labelled share of the guest list (company, group, language, diet).</summary>
public sealed record ReportSlice(string Label, int Count);

/// <summary>A scan point and how many distinct guests passed it. Repeats are not people.</summary>
public sealed record ReportCheckpoint(string Code, int People, int Scans, DateTimeOffset? First, DateTimeOffset? Last);

/// <summary>
/// Everything the post-event report needs that the live dashboard does not carry: the arrival
/// curve, who came from where, how long people stayed, and what each scan point actually saw.
/// </summary>
public sealed record EventReportStatsDto(
    int Guests,
    int Companions,
    int Confirmed,
    int Declined,
    int CheckedIn,
    int CheckedOut,
    int NoShow,
    double AttendancePct,
    int OnboardingCompleted,
    int PhotoConsents,
    DateTimeOffset? FirstCheckIn,
    DateTimeOffset? LastCheckIn,
    int PeakArrivals,
    DateTimeOffset? PeakAt,
    double? AverageMinutesOnSite,
    int TotalScans,
    IReadOnlyList<ReportBucket> Arrivals,
    IReadOnlyList<ReportSlice> Companies,
    IReadOnlyList<ReportSlice> Groups,
    IReadOnlyList<ReportSlice> Dietary,
    IReadOnlyList<ReportCheckpoint> Checkpoints);

public sealed record EventReportStatsQuery(Guid EventId) : IRequest<EventReportStatsDto>;

public sealed class EventReportStatsHandler(IAppDbContext db)
    : IRequestHandler<EventReportStatsQuery, EventReportStatsDto>
{
    /// <summary>Arrival slot width. Fine enough to show a rush, coarse enough to stay readable.</summary>
    private static readonly TimeSpan Slot = TimeSpan.FromMinutes(15);

    public async Task<EventReportStatsDto> Handle(EventReportStatsQuery request, CancellationToken ct)
    {
        var people = await db.Set<Participant>().AsNoTracking()
            .Where(p => p.EventId == request.EventId)
            .Select(p => new
            {
                p.Status,
                p.CheckedInAt,
                p.CheckedOutAt,
                p.Company,
                p.GroupName,
                p.DietaryPreferences,
                p.ParentParticipantId,
                p.OnboardingCompletedAt,
                p.PhotoConsent,
            })
            .ToListAsync(ct);

        var scans = await db.Set<ScanEvent>().AsNoTracking()
            .Where(s => s.EventId == request.EventId)
            .Select(s => new { s.Kind, s.StationCode, s.ParticipantId, s.OccurredAt })
            .ToListAsync(ct);

        // Accompanying persons are guests in the room but not on the invitation list, so they are
        // counted separately rather than inflating the head count the client was billed against.
        var guests = people.Where(p => p.ParentParticipantId is null).ToList();
        var companions = people.Count - guests.Count;

        var checkedIn = people.Where(p => p.CheckedInAt is not null).ToList();
        var arrivals = checkedIn
            .GroupBy(p => Floor(p.CheckedInAt!.Value))
            .OrderBy(g => g.Key)
            .Select(g => new ReportBucket(g.Key, g.Count()))
            .ToList();
        var peak = arrivals.Count == 0 ? null : arrivals.MaxBy(b => b.Count);

        // Only guests with both ends recorded — a missing check-out is an unknown, not a zero.
        var stays = people
            .Where(p => p.CheckedInAt is not null && p.CheckedOutAt > p.CheckedInAt)
            .Select(p => (p.CheckedOutAt!.Value - p.CheckedInAt!.Value).TotalMinutes)
            .ToList();

        var checkpoints = scans
            .Where(s => s.Kind == ScanKind.Station && !string.IsNullOrWhiteSpace(s.StationCode))
            .GroupBy(s => s.StationCode!)
            .Select(g => new ReportCheckpoint(
                g.Key,
                g.Select(s => s.ParticipantId).Distinct().Count(),
                g.Count(),
                g.Min(s => s.OccurredAt),
                g.Max(s => s.OccurredAt)))
            .OrderByDescending(c => c.People)
            .ToList();

        return new EventReportStatsDto(
            Guests: guests.Count,
            Companions: companions,
            Confirmed: people.Count(p => p.Status == ParticipantStatus.Confirmed),
            Declined: people.Count(p => p.Status == ParticipantStatus.Declined),
            CheckedIn: checkedIn.Count,
            CheckedOut: people.Count(p => p.CheckedOutAt is not null),
            NoShow: people.Count(p => p.CheckedInAt is null && p.Status != ParticipantStatus.Declined),
            AttendancePct: people.Count == 0 ? 0 : Math.Round(checkedIn.Count * 100.0 / people.Count, 1),
            OnboardingCompleted: people.Count(p => p.OnboardingCompletedAt is not null),
            PhotoConsents: people.Count(p => p.PhotoConsent),
            FirstCheckIn: checkedIn.Count == 0 ? null : checkedIn.Min(p => p.CheckedInAt),
            LastCheckIn: checkedIn.Count == 0 ? null : checkedIn.Max(p => p.CheckedInAt),
            PeakArrivals: peak?.Count ?? 0,
            PeakAt: peak?.At,
            AverageMinutesOnSite: stays.Count == 0 ? null : Math.Round(stays.Average(), 0),
            TotalScans: scans.Count,
            Arrivals: arrivals,
            Companies: Top(people.Select(p => p.Company)),
            Groups: Top(people.Select(p => p.GroupName)),
            Dietary: Top(people.Select(p => p.DietaryPreferences)),
            Checkpoints: checkpoints);
    }

    private static DateTimeOffset Floor(DateTimeOffset value) =>
        value.AddTicks(-(value.Ticks % Slot.Ticks));

    /// <summary>Biggest groups first, blanks dropped. Ten is what fits on a page and stays legible.</summary>
    private static List<ReportSlice> Top(IEnumerable<string?> values) =>
        values
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .GroupBy(v => v!.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(g => new ReportSlice(g.Key, g.Count()))
            .OrderByDescending(s => s.Count)
            .ThenBy(s => s.Label, StringComparer.CurrentCulture)
            .Take(10)
            .ToList();
}
