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
