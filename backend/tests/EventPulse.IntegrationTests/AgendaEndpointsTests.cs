using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using EventPulse.Infrastructure.Outbox;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Participants.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EventPulse.IntegrationTests;

public class AgendaEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AgendaEndpointsTests(ApiFactory factory) => _factory = factory;

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
            name = $"AgendaEvent {Guid.NewGuid():N}",
            clientEmail = "klient@test.local",
            startsAt = DateTimeOffset.UtcNow.AddDays(7),
            endsAt = DateTimeOffset.UtcNow.AddDays(8),
        });
        return (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static object Item(string titlePl, string titleEn, string? group = null) => new
    {
        startsAt = DateTimeOffset.UtcNow.AddDays(7),
        endsAt = DateTimeOffset.UtcNow.AddDays(7).AddHours(1),
        titlePl,
        titleEn,
        type = 0,
        requiresCheckIn = false,
        groupName = group,
    };

    private async Task DrainOutboxAsync()
    {
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<IOutboxDispatcher>().ProcessPendingAsync();
    }

    private async Task<Guid> GetParticipantTokenAsync(Guid eventId, string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var p = await db.Set<Participant>().IgnoreQueryFilters().FirstAsync(x => x.Email == email && x.EventId == eventId);
        return p.AccessToken;
    }

    [Fact]
    public async Task Editing_an_agenda_item_sends_no_mail()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);

        var email = $"agenda-{Guid.NewGuid():N}@x.com";
        await admin.PostAsJsonAsync($"/api/events/{eventId}/participants",
            new { firstName = "Eve", lastName = "Guest", email });

        var create = await admin.PostAsJsonAsync($"/api/events/{eventId}/agenda", Item("Kolacja", "Dinner"));
        create.EnsureSuccessStatusCode();
        var itemId = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var list = await admin.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}/agenda");
        Assert.Equal(1, list.GetArrayLength());

        // Editing the agenda must be silent: ten edits used to mean ten mail waves to every guest.
        var update = await admin.PutAsJsonAsync($"/api/events/{eventId}/agenda/{itemId}", Item("Kolacja 19:30", "Dinner 19:30"));
        update.EnsureSuccessStatusCode();
        await DrainOutboxAsync();

        Assert.DoesNotContain(_factory.SentEmails, m => m.ToEmail == email);
    }

    [Fact]
    public async Task Notify_mails_every_guest_once_and_skips_companions()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);

        var first = $"agenda-a-{Guid.NewGuid():N}@x.com";
        var second = $"agenda-b-{Guid.NewGuid():N}@x.com";
        await admin.PostAsJsonAsync($"/api/events/{eventId}/participants", new { firstName = "A", lastName = "Guest", email = first });
        await admin.PostAsJsonAsync($"/api/events/{eventId}/participants", new { firstName = "B", lastName = "Guest", email = second });
        await admin.PostAsJsonAsync($"/api/events/{eventId}/agenda", Item("Kolacja", "Dinner"));

        // An accompanying person has no e-mail of their own. The old automatic handler did not
        // filter them out, so the send threw and the outbox retried it every 5s forever.
        await AddCompanionAsync(eventId, first);

        var resp = await admin.PostAsync($"/api/events/{eventId}/agenda/notify", null);
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, body.GetProperty("sentCount").GetInt32());
        Assert.Equal(0, body.GetProperty("failedCount").GetInt32());

        // The mail carries the current agenda, so a guest sees what is now true.
        var sent = _factory.SentEmails.Where(m => m.ToEmail == first || m.ToEmail == second).ToList();
        Assert.Equal(2, sent.Count);
        Assert.All(sent, m => Assert.Contains("Kolacja", m.HtmlBody));
    }

    [Fact]
    public async Task Notify_reports_a_conflict_when_the_agenda_is_empty()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);
        await admin.PostAsJsonAsync($"/api/events/{eventId}/participants",
            new { firstName = "Eve", lastName = "Guest", email = $"agenda-c-{Guid.NewGuid():N}@x.com" });

        var resp = await admin.PostAsync($"/api/events/{eventId}/agenda/notify", null);
        Assert.Equal(HttpStatusCode.Conflict, resp.StatusCode);
    }

    /// <summary>Adds an accompanying person (no e-mail) straight to the DB, as the guest app would.</summary>
    private async Task AddCompanionAsync(Guid eventId, string parentEmail)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var parent = await db.Set<Participant>().IgnoreQueryFilters()
            .FirstAsync(x => x.Email == parentEmail && x.EventId == eventId);
        db.Set<Participant>().Add(new Participant
        {
            EventId = eventId,
            TenantId = parent.TenantId,
            FirstName = "Plus",
            LastName = "One",
            Email = null,
            ParentParticipantId = parent.Id,
        });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Participant_sees_common_items_but_not_other_groups()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);

        await admin.PostAsJsonAsync($"/api/events/{eventId}/agenda", Item("Wspólny punkt", "Common"));
        await admin.PostAsJsonAsync($"/api/events/{eventId}/agenda", Item("Tylko grupa B", "Group B only", group: "B"));

        var email = $"viewer-{Guid.NewGuid():N}@x.com";
        await admin.PostAsJsonAsync($"/api/events/{eventId}/participants",
            new { firstName = "Vi", lastName = "Ewer", email });
        var token = await GetParticipantTokenAsync(eventId, email);

        var login = await _factory.CreateClient().PostAsJsonAsync("/api/auth/participant", new { token });
        var session = await login.Content.ReadFromJsonAsync<JsonElement>();
        var participant = _factory.CreateClient();
        participant.DefaultRequestHeaders.Authorization = new("Bearer", session.GetProperty("accessToken").GetString());

        var agenda = await participant.GetFromJsonAsync<JsonElement>("/api/me/agenda");

        // Participant has no group → sees only the common item.
        Assert.Equal(1, agenda.GetArrayLength());
        Assert.Equal("Wspólny punkt", agenda[0].GetProperty("titlePl").GetString());
    }
}
