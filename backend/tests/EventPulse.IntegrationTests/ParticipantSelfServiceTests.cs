using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Participants.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EventPulse.IntegrationTests;

public class ParticipantSelfServiceTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public ParticipantSelfServiceTests(ApiFactory factory) => _factory = factory;

    private async Task<HttpClient> AdminClientAsync()
    {
        var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = "admin@falp.local", password = "Admin123!" });
        login.EnsureSuccessStatusCode();
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization = new("Bearer", tokens.GetProperty("accessToken").GetString());
        return client;
    }

    private async Task<Guid> GetAccessTokenAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var participant = await db.Set<Participant>().IgnoreQueryFilters().FirstAsync(p => p.Email == email);
        return participant.AccessToken;
    }

    [Fact]
    public async Task Full_participant_onboarding_flow()
    {
        var admin = await AdminClientAsync();

        var createEvent = await admin.PostAsJsonAsync("/api/events", new
        {
            name = $"Onboarding {Guid.NewGuid():N}",
            clientEmail = "klient@test.local",
            startsAt = DateTimeOffset.UtcNow.AddDays(5),
            endsAt = DateTimeOffset.UtcNow.AddDays(6),
            defaultLanguage = "pl",
        });
        var eventId = (await createEvent.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var email = $"anna-{Guid.NewGuid():N}@self.com";
        await admin.PostAsJsonAsync($"/api/events/{eventId}/participants",
            new { firstName = "Anna", lastName = "Self", email });

        var token = await GetAccessTokenAsync(email);

        // Exchange the long-lived token for a participant JWT.
        var login = await _factory.CreateClient().PostAsJsonAsync("/api/auth/participant", new { token });
        login.EnsureSuccessStatusCode();
        var session = await login.Content.ReadFromJsonAsync<JsonElement>();

        var participant = _factory.CreateClient();
        participant.DefaultRequestHeaders.Authorization = new("Bearer", session.GetProperty("accessToken").GetString());

        var me = await participant.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.Equal(email, me.GetProperty("email").GetString());
        Assert.False(me.GetProperty("hasAcceptedRodo").GetBoolean());

        // RODO is mandatory.
        var refused = await participant.PostAsJsonAsync("/api/me/consents",
            new { rodoAccepted = false, photoConsent = false, networkingConsent = false });
        Assert.Equal(HttpStatusCode.Conflict, refused.StatusCode);

        var consented = await participant.PostAsJsonAsync("/api/me/consents",
            new { rodoAccepted = true, photoConsent = true, networkingConsent = false });
        consented.EnsureSuccessStatusCode();
        var afterConsent = await consented.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(afterConsent.GetProperty("hasAcceptedRodo").GetBoolean());
        Assert.True(afterConsent.GetProperty("photoConsent").GetBoolean());

        var prefs = await participant.PutAsJsonAsync("/api/me/preferences", new
        {
            language = "en",
            dietaryPreferences = "wegańskie",
            airportTransfer = true,
            arrivalTime = "14:30",
            flightNumber = "LO245",
        });
        prefs.EnsureSuccessStatusCode();
        var afterPrefs = await prefs.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("en", afterPrefs.GetProperty("language").GetString());
        Assert.Equal("wegańskie", afterPrefs.GetProperty("dietaryPreferences").GetString());
        Assert.True(afterPrefs.GetProperty("airportTransfer").GetBoolean());
    }

    [Fact]
    public async Task Invalid_participant_token_is_rejected()
    {
        var resp = await _factory.CreateClient()
            .PostAsJsonAsync("/api/auth/participant", new { token = Guid.NewGuid() });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Sending_invitations_dispatches_emails()
    {
        var admin = await AdminClientAsync();
        var createEvent = await admin.PostAsJsonAsync("/api/events", new
        {
            name = $"Invite {Guid.NewGuid():N}",
            clientEmail = "klient@test.local",
            startsAt = DateTimeOffset.UtcNow.AddDays(5),
            endsAt = DateTimeOffset.UtcNow.AddDays(6),
        });
        var eventId = (await createEvent.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var email = $"bob-{Guid.NewGuid():N}@x.com";
        await admin.PostAsJsonAsync($"/api/events/{eventId}/participants",
            new { firstName = "Bob", lastName = "Guest", email });

        var resp = await admin.PostAsync($"/api/events/{eventId}/participants/invitations?onlyNotInvited=true", null);
        resp.EnsureSuccessStatusCode();
        var result = await resp.Content.ReadFromJsonAsync<JsonElement>();

        // Counted per guest, not per mail: one guest served, even though two mails went out.
        Assert.Equal(1, result.GetProperty("sentCount").GetInt32());

        // An invitation is a PAIR — the app link and, separately, the QR code — and the two must be
        // told apart in the inbox, so their subjects differ.
        var mails = _factory.SentEmails.Where(m => m.ToEmail == email).ToList();
        Assert.Equal(2, mails.Count);
        Assert.Equal(2, mails.Select(m => m.Subject).Distinct().Count());

        var invitation = Assert.Single(mails, m => !m.Subject.Contains("kod QR", StringComparison.OrdinalIgnoreCase));
        Assert.Contains("Bob", invitation.HtmlBody);
        Assert.Contains("Invite", invitation.Subject);
        Assert.Contains("href=", invitation.HtmlBody);

        // The QR mail carries the code itself, inline and as a saveable attachment.
        var qr = Assert.Single(mails, m => m.Subject.Contains("kod QR", StringComparison.OrdinalIgnoreCase));
        Assert.Equal(2, qr.Attachments!.Count);
    }

    [Fact]
    public async Task Adding_a_participant_sends_nothing()
    {
        var admin = await AdminClientAsync();
        var createEvent = await admin.PostAsJsonAsync("/api/events", new
        {
            name = $"Quiet {Guid.NewGuid():N}",
            clientEmail = "klient@test.local",
            startsAt = DateTimeOffset.UtcNow.AddDays(5),
            endsAt = DateTimeOffset.UtcNow.AddDays(6),
        });
        var eventId = (await createEvent.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        // Building a guest list must stay silent — mails go out only from an explicit send action.
        var plain = $"quiet-{Guid.NewGuid():N}@x.com";
        var entryOnly = $"quiet-qr-{Guid.NewGuid():N}@x.com";
        await admin.PostAsJsonAsync($"/api/events/{eventId}/participants",
            new { firstName = "Quiet", lastName = "Guest", email = plain });
        await admin.PostAsJsonAsync($"/api/events/{eventId}/participants",
            new { firstName = "Code", lastName = "Only", email = entryOnly, entryOnly = true });

        Assert.DoesNotContain(_factory.SentEmails, m => m.ToEmail == plain || m.ToEmail == entryOnly);
    }

    [Fact]
    public async Task Inviting_one_guest_sends_that_guest_the_pair()
    {
        var admin = await AdminClientAsync();
        var createEvent = await admin.PostAsJsonAsync("/api/events", new
        {
            name = $"One {Guid.NewGuid():N}",
            clientEmail = "klient@test.local",
            startsAt = DateTimeOffset.UtcNow.AddDays(5),
            endsAt = DateTimeOffset.UtcNow.AddDays(6),
        });
        var eventId = (await createEvent.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var target = $"one-{Guid.NewGuid():N}@x.com";
        var bystander = $"other-{Guid.NewGuid():N}@x.com";
        var created = await admin.PostAsJsonAsync($"/api/events/{eventId}/participants",
            new { firstName = "One", lastName = "Guest", email = target });
        var targetId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await admin.PostAsJsonAsync($"/api/events/{eventId}/participants",
            new { firstName = "By", lastName = "Stander", email = bystander });

        var resp = await admin.PostAsync($"/api/events/{eventId}/participants/{targetId}/invitation", null);
        resp.EnsureSuccessStatusCode();
        Assert.Equal(1, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("sentCount").GetInt32());

        Assert.Equal(2, _factory.SentEmails.Count(m => m.ToEmail == target));
        Assert.DoesNotContain(_factory.SentEmails, m => m.ToEmail == bystander);
    }
}
