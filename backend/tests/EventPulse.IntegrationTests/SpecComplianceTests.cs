using System.Net.Http.Json;
using System.Text.Json;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Participants.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EventPulse.IntegrationTests;

/// <summary>
/// Closes test gaps for flows that were implemented but previously unverified
/// (see docs/flows/COMPLIANCE.md): station-scan dashboard activity, the
/// enriched scan result for the operator, the participant self-QR endpoint,
/// and event archiving.
/// </summary>
public class SpecComplianceTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public SpecComplianceTests(ApiFactory factory) => _factory = factory;

    private async Task<HttpClient> AdminClientAsync()
    {
        var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = "admin@falp.local", password = "Admin123!" });
        login.EnsureSuccessStatusCode();
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization = new("Bearer", tokens.GetProperty("accessToken").GetString());
        return client;
    }

    private async Task<Guid> CreateEventAsync(HttpClient client)
    {
        var resp = await client.PostAsJsonAsync("/api/events", new
        {
            name = $"Compliance {Guid.NewGuid():N}",
            startsAt = DateTimeOffset.UtcNow,
            endsAt = DateTimeOffset.UtcNow.AddHours(6),
        });
        return (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private async Task<Guid> AddParticipantTokenAsync(HttpClient client, Guid eventId, string first = "Scan", string last = "Guest")
    {
        var email = $"compl-{Guid.NewGuid():N}@x.com";
        await client.PostAsJsonAsync($"/api/events/{eventId}/participants", new { firstName = first, lastName = last, email });
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var p = await db.Set<Participant>().IgnoreQueryFilters().FirstAsync(x => x.Email == email);
        return p.AccessToken;
    }

    // ── QR-5 / DR-1 / DR-3: station scan recorded and aggregated on the dashboard ──
    [Fact]
    public async Task Station_scan_is_recorded_and_appears_on_dashboard()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);
        var token = await AddParticipantTokenAsync(admin, eventId);

        var batch = new
        {
            items = new[]
            {
                // kind = 2 → Station (presence at a named post, no status change).
                new { clientId = Guid.NewGuid(), participantToken = token, kind = 2, occurredAt = DateTimeOffset.UtcNow, stationCode = "BAR", online = true },
            },
        };
        var resp = await admin.PostAsJsonAsync($"/api/events/{eventId}/scans/batch", batch);
        resp.EnsureSuccessStatusCode();
        Assert.Equal(1, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accepted").GetInt32());

        var dashboard = await admin.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}/dashboard");
        var stations = dashboard.GetProperty("stations").EnumerateArray().ToList();
        Assert.Contains(stations, s => s.GetProperty("code").GetString() == "BAR" && s.GetProperty("count").GetInt32() == 1);
    }

    // ── QR-3: the operator's scan result carries who was scanned + re-entry warning ──
    [Fact]
    public async Task Scan_result_includes_participant_name_and_reentry_flag()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);
        var token = await AddParticipantTokenAsync(admin, eventId, "Jan", "Kowalski");

        // First check-in → accepted, named, not a re-entry.
        var first = await admin.PostAsJsonAsync($"/api/events/{eventId}/scans/batch", new
        {
            items = new[]
            {
                new { clientId = Guid.NewGuid(), participantToken = token, kind = 0, occurredAt = DateTimeOffset.UtcNow, stationCode = "ENTRY", online = true },
            },
        });
        var firstItem = (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("items")[0];
        Assert.Equal("accepted", firstItem.GetProperty("status").GetString());
        Assert.Equal("Jan Kowalski", firstItem.GetProperty("name").GetString());
        Assert.False(firstItem.GetProperty("alreadyCheckedIn").GetBoolean());

        // Second check-in with a NEW clientId → accepted again, but flagged as a re-entry with a prior time.
        var second = await admin.PostAsJsonAsync($"/api/events/{eventId}/scans/batch", new
        {
            items = new[]
            {
                new { clientId = Guid.NewGuid(), participantToken = token, kind = 0, occurredAt = DateTimeOffset.UtcNow.AddMinutes(5), stationCode = "ENTRY", online = true },
            },
        });
        var secondItem = (await second.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("items")[0];
        Assert.Equal("accepted", secondItem.GetProperty("status").GetString());
        Assert.True(secondItem.GetProperty("alreadyCheckedIn").GetBoolean());
        Assert.False(secondItem.GetProperty("previousAt").ValueKind == JsonValueKind.Null);
    }

    // ── PA-2: participant can fetch their own entry QR as a PNG ──
    [Fact]
    public async Task My_qr_returns_png()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);
        var token = await AddParticipantTokenAsync(admin, eventId);

        var login = await _factory.CreateClient().PostAsJsonAsync("/api/auth/participant", new { token });
        login.EnsureSuccessStatusCode();
        var session = await login.Content.ReadFromJsonAsync<JsonElement>();

        var participant = _factory.CreateClient();
        participant.DefaultRequestHeaders.Authorization = new("Bearer", session.GetProperty("accessToken").GetString());

        var qr = await participant.GetAsync("/api/me/qr");
        qr.EnsureSuccessStatusCode();
        Assert.Equal("image/png", qr.Content.Headers.ContentType?.MediaType);
        var bytes = await qr.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 100); // a real PNG, not an empty body
    }

    // ── AE-4: an event can be archived by walking the lifecycle transitions ──
    // Allowed chain (EventStatusTransitions): Draft→Published→Live→Completed→Archived.
    [Fact]
    public async Task Event_can_be_archived_via_status()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);

        foreach (var status in new[] { 1, 2, 3, 4 }) // Published, Live, Completed, Archived
        {
            var step = await admin.PostAsJsonAsync($"/api/events/{eventId}/status", new { newStatus = status });
            step.EnsureSuccessStatusCode();
        }

        var ev = await admin.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}");
        Assert.Equal(4, ev.GetProperty("status").GetInt32());
    }
}
