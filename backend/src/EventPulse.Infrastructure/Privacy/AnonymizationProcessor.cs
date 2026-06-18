using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Events.Domain;
using EventPulse.Modules.Participants.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace EventPulse.Infrastructure.Privacy;

/// <summary>
/// Periodically anonymizes personal data for events that opted in, once
/// <c>EndsAt + AnonymizeAfterDays</c> has passed. Aggregate stats (scan counts,
/// check-in timestamps, status) are preserved; only personally-identifying fields
/// are scrubbed. Runs cross-tenant, so it bypasses the tenant query filter.
/// </summary>
public sealed class AnonymizationProcessor : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);
    private static readonly TimeSpan StartupDelay = TimeSpan.FromSeconds(20);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AnonymizationProcessor> _logger;

    public AnonymizationProcessor(IServiceScopeFactory scopeFactory, ILogger<AnonymizationProcessor> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let migrations/seeding settle before the first pass.
        try { await Task.Delay(StartupDelay, stoppingToken); }
        catch (OperationCanceledException) { return; }

        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Anonymization loop error");
            }
        }
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTimeOffset.UtcNow;

        // Coarse SQL filter (EndsAt in the past); refine the day offset in memory since
        // EndsAt.AddDays(n) doesn't translate cleanly to SQL.
        var candidates = await db.Set<Event>()
            .IgnoreQueryFilters()
            .Where(e => e.AnonymizeEnabled && e.AnonymizedAt == null && e.EndsAt <= now)
            .ToListAsync(ct);

        var due = candidates.Where(e => e.EndsAt.AddDays(e.AnonymizeAfterDays) <= now).ToList();
        if (due.Count == 0)
        {
            return;
        }

        foreach (var ev in due)
        {
            var participants = await db.Set<Participant>()
                .IgnoreQueryFilters()
                .Where(p => p.EventId == ev.Id)
                .ToListAsync(ct);

            foreach (var p in participants)
            {
                Anonymize(p);
            }

            ev.AnonymizedAt = now;
            _logger.LogInformation(
                "Anonymized {Count} participants for event {EventId} ({Name}).",
                participants.Count, ev.Id, ev.Name);
        }

        await db.SaveChangesAsync(ct);
    }

    /// <summary>Scrubs every personally-identifying field while keeping the row for statistics.</summary>
    private static void Anonymize(Participant p)
    {
        p.FirstName = "Uczestnik";
        p.LastName = "(zanonimizowany)";
        p.Email = $"anon+{p.Id:N}@anonymized.invalid"; // unique per event, keeps the NOT NULL column valid
        p.Phone = null;
        p.Company = null;
        p.Position = null;
        p.GroupName = null;
        p.HotelName = null;
        p.HotelAddress = null;
        p.HotelPhone = null;
        p.DietaryPreferences = null;
        p.ShirtSize = null;
        p.Wishes = null;
        p.Notes = null;
        p.ArrivalTime = null;
        p.FlightNumber = null;
        p.AccessToken = Guid.NewGuid(); // invalidate the old QR / login link
    }
}
