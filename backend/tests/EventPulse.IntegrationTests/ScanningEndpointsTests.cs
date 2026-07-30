using System.Net.Http.Json;
using System.Text.Json;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Participants.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EventPulse.IntegrationTests;

public class ScanningEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public ScanningEndpointsTests(ApiFactory factory) => _factory = factory;

    private async Task<HttpClient> AdminClientAsync()
    {
        var client = _factory.CreateClient()
        ;
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = "admin@falp.local", password = "Admin123!" })
        ;
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>()
        ;
        client.DefaultRequestHeaders.Authorization = new("Bearer", tokens.GetProperty("accessToken").GetString())
        ;
        return client
        ;
    }

    private async Task<Guid> CreateEventAsync(HttpClient client)
    {
        var resp = await client.PostAsJsonAsync("/api/events", new
        {
            name = $"ScanEvent {Guid.NewGuid():N}",
            clientEmail = "klient@test.local",
            startsAt = DateTimeOffset.UtcNow,
            endsAt = DateTimeOffset.UtcNow.AddHours(6),
        })
        ;
        return (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid()
        ;
    }

    private async Task<(string email, Guid token)> AddParticipantAsync(HttpClient client, Guid eventId)
    {
        var email = $"scan-{Guid.NewGuid():N}@x.com";
        await client.PostAsJsonAsync($"/api/events/{eventId}/participants",
            new { firstName = "Scan", lastName = "Guest", email });

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var p = await db.Set<Participant>().IgnoreQueryFilters().FirstAsync(x => x.Email == email);
        return (email, p.AccessToken);
    }

    [Fact]
    public async Task Checkin_is_idempotent_and_updates_dashboard()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);
        var (_, token) = await AddParticipantAsync(admin, eventId);

        var clientId = Guid.NewGuid();
        var batch = new
        {
            items = new[]
            {
                new { clientId, participantToken = token, kind = 0, occurredAt = DateTimeOffset.UtcNow, stationCode = (string?)null, online = true },
            },
        };

        var first = await admin.PostAsJsonAsync($"/api/events/{eventId}/scans/batch", batch);
        first.EnsureSuccessStatusCode();
        Assert.Equal(1, (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accepted").GetInt32());

        // Re-sync the same clientId → duplicate, not a second check-in.
        var second = await admin.PostAsJsonAsync($"/api/events/{eventId}/scans/batch", batch);
        Assert.Equal(1, (await second.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("duplicates").GetInt32());

        var dashboard = await admin.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}/dashboard");
        Assert.Equal(1, dashboard.GetProperty("checkedIn").GetInt32());
        Assert.Equal(1, dashboard.GetProperty("total").GetInt32());
        Assert.Equal(100, dashboard.GetProperty("attendancePct").GetDouble());
    }

    [Fact]
    public async Task Checkout_without_checkin_warns_and_keeps_the_guest_visible()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);
        var (_, token) = await AddParticipantAsync(admin, eventId);

        // kind = 1 (CheckOut) for someone who was never checked in — the classic "wrong mode at
        // the entrance" mistake. It must be flagged, not reported as a clean pass.
        var batch = new
        {
            items = new[]
            {
                new { clientId = Guid.NewGuid(), participantToken = token, kind = 1, occurredAt = DateTimeOffset.UtcNow, stationCode = (string?)null, online = true },
            },
        };

        var resp = await admin.PostAsJsonAsync($"/api/events/{eventId}/scans/batch", batch);
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("nocheckin", body.GetProperty("items")[0].GetProperty("status").GetString());

        // The guest must stay countable: still pending (not CheckedOut), so no-show marking and the
        // dashboard funnel keep seeing them.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var p = await db.Set<Participant>().IgnoreQueryFilters().FirstAsync(x => x.AccessToken == token);
        Assert.NotEqual(ParticipantStatus.CheckedOut, p.Status);
        Assert.Null(p.CheckedInAt);
        Assert.NotNull(p.CheckedOutAt); // the scan itself is still recorded

        var noShows = await admin.PostAsync($"/api/events/{eventId}/no-shows", null);
        Assert.Equal(1, (await noShows.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("marked").GetInt32());
    }

    [Fact]
    public async Task Qr_flagged_agenda_items_are_offered_as_presence_points()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);

        await AddAgendaItemAsync(admin, eventId, "Autokar z Kermi do hotelu", requiresCheckIn: true);
        await AddAgendaItemAsync(admin, eventId, "Wykład bez QR", requiresCheckIn: false);

        var stations = await admin.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}/scanner/stations");
        var names = stations.EnumerateArray().Select(s => s.GetProperty("name").GetString()).ToList();

        Assert.Contains("Autokar z Kermi do hotelu", names);
        Assert.DoesNotContain("Wykład bez QR", names);

        var coach = stations.EnumerateArray().First(s => s.GetProperty("name").GetString() == "Autokar z Kermi do hotelu");
        // Presence, not check-in: this is what stops a coach scan from moving the door numbers.
        Assert.False(coach.GetProperty("countsAsCheckIn").GetBoolean());
        Assert.Equal(0, coach.GetProperty("scanLimitPerParticipant").GetInt32());
    }

    [Fact]
    public async Task Scanning_at_an_agenda_point_records_presence_without_touching_attendance()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);
        var (_, token) = await AddParticipantAsync(admin, eventId);
        await AddAgendaItemAsync(admin, eventId, "Autokar z hotelu do Kermi", requiresCheckIn: true);

        var batch = new
        {
            items = new[]
            {
                new
                {
                    clientId = Guid.NewGuid(),
                    participantToken = token,
                    kind = 2, // ScanKind.Station
                    occurredAt = DateTimeOffset.UtcNow,
                    stationCode = "Autokar z hotelu do Kermi",
                    online = true,
                },
            },
        };

        var resp = await admin.PostAsJsonAsync($"/api/events/{eventId}/scans/batch", batch);
        resp.EnsureSuccessStatusCode();
        Assert.Equal(1, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accepted").GetInt32());

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var p = await db.Set<Participant>().IgnoreQueryFilters().FirstAsync(x => x.AccessToken == token);
        Assert.Null(p.CheckedInAt);
        Assert.Null(p.CheckedOutAt);
        Assert.Equal(ParticipantStatus.Invited, p.Status);

        // …and the roll-call names the person who boarded.
        var activity = await admin.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}/agenda/activity");
        var point = activity.EnumerateArray().Single();
        Assert.Equal(1, point.GetProperty("people").GetInt32());
        Assert.Equal("Scan Guest", point.GetProperty("entries")[0].GetProperty("participantName").GetString());
    }

    [Fact]
    public async Task An_unknown_code_is_refused_at_an_agenda_point_too()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);
        await AddAgendaItemAsync(admin, eventId, "Autokar z Hotelu do Concordii", requiresCheckIn: true);

        // "Only participants may board" — an unknown QR resolves to nobody on this event's list.
        var batch = new
        {
            items = new[]
            {
                new
                {
                    clientId = Guid.NewGuid(),
                    participantToken = Guid.NewGuid(),
                    kind = 2,
                    occurredAt = DateTimeOffset.UtcNow,
                    stationCode = "Autokar z Hotelu do Concordii",
                    online = true,
                },
            },
        };

        var resp = await admin.PostAsJsonAsync($"/api/events/{eventId}/scans/batch", batch);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, body.GetProperty("notFound").GetInt32());
        Assert.Equal(0, body.GetProperty("accepted").GetInt32());
    }

    private async Task AddAgendaItemAsync(HttpClient client, Guid eventId, string title, bool requiresCheckIn)
    {
        var resp = await client.PostAsJsonAsync($"/api/events/{eventId}/agenda", new
        {
            startsAt = DateTimeOffset.UtcNow.AddDays(1),
            endsAt = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            titlePl = title,
            titleEn = title,
            type = 3,
            requiresCheckIn,
        });
        resp.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Unknown_token_is_reported_not_found()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);

        var batch = new
        {
            items = new[]
            {
                new { clientId = Guid.NewGuid(), participantToken = Guid.NewGuid(), kind = 0, occurredAt = DateTimeOffset.UtcNow, stationCode = (string?)null, online = true },
            },
        };

        var resp = await admin.PostAsJsonAsync($"/api/events/{eventId}/scans/batch", batch);
        Assert.Equal(1, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("notFound").GetInt32());
    }

    [Fact]
    public async Task No_shows_are_marked_for_absentees()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);
        var (_, token) = await AddParticipantAsync(admin, eventId);
        await AddParticipantAsync(admin, eventId); // never checks in

        // Check in only the first.
        await admin.PostAsJsonAsync($"/api/events/{eventId}/scans/batch", new
        {
            items = new[]
            {
                new { clientId = Guid.NewGuid(), participantToken = token, kind = 0, occurredAt = DateTimeOffset.UtcNow, stationCode = (string?)null, online = true },
            },
        });

        var resp = await admin.PostAsync($"/api/events/{eventId}/no-shows", null);
        resp.EnsureSuccessStatusCode();
        Assert.Equal(1, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("marked").GetInt32());
    }
}
