using System.Net.Http.Json;
using System.Text.Json;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Participants.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EventPulse.IntegrationTests;

public class EngagementTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public EngagementTests(ApiFactory factory) => _factory = factory;

    private async Task<HttpClient> AdminAsync()
    {
        var c = _factory.CreateClient();
        var login = await c.PostAsJsonAsync("/api/auth/login", new { email = "admin@falp.local", password = "Admin123!" });
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>();
        c.DefaultRequestHeaders.Authorization = new("Bearer", tokens.GetProperty("accessToken").GetString());
        return c;
    }

    private async Task<Guid> EventAsync(HttpClient admin) =>
        (await (await admin.PostAsJsonAsync("/api/events", new
        {
            name = $"Eng {Guid.NewGuid():N}",
            startsAt = DateTimeOffset.UtcNow,
            endsAt = DateTimeOffset.UtcNow.AddHours(3),
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

    private async Task<(Guid id, Guid token)> ParticipantAsync(HttpClient admin, Guid eventId, bool networking)
    {
        var email = $"e-{Guid.NewGuid():N}@x.com";
        await admin.PostAsJsonAsync($"/api/events/{eventId}/participants", new { firstName = "P", lastName = "X", email });
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var p = await db.Set<Participant>().IgnoreQueryFilters().FirstAsync(x => x.Email == email);
        if (networking)
        {
            p.NetworkingConsent = true;
            await db.SaveChangesAsync();
        }

        return (p.Id, p.AccessToken);
    }

    private async Task<HttpClient> ParticipantClientAsync(Guid token)
    {
        var c = _factory.CreateClient();
        var session = await (await c.PostAsJsonAsync("/api/auth/participant", new { token })).Content.ReadFromJsonAsync<JsonElement>();
        c.DefaultRequestHeaders.Authorization = new("Bearer", session.GetProperty("accessToken").GetString());
        return c;
    }

    [Fact]
    public async Task Contest_results_and_ranking()
    {
        var admin = await AdminAsync();
        var eventId = await EventAsync(admin);
        var (pid, _) = await ParticipantAsync(admin, eventId, networking: false);

        var contest = await (await admin.PostAsJsonAsync($"/api/events/{eventId}/contests", new { name = "Bieg", mode = 0 }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var contestId = contest.GetProperty("id").GetGuid();

        await admin.PostAsJsonAsync($"/api/events/{eventId}/contests/{contestId}/results",
            new { participantId = pid, score = 42.0 });

        var ranking = await admin.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}/contests/{contestId}/ranking");
        Assert.Equal(1, ranking.GetArrayLength());
        Assert.Equal(42, ranking[0].GetProperty("score").GetDouble());
    }

    [Fact]
    public async Task Quiz_take_hides_answers_and_scores_submission()
    {
        var admin = await AdminAsync();
        var eventId = await EventAsync(admin);
        var (_, token) = await ParticipantAsync(admin, eventId, networking: false);

        var quizId = (await (await admin.PostAsJsonAsync($"/api/events/{eventId}/quizzes", new { title = "Wiedza" }))
            .Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await admin.PostAsJsonAsync($"/api/events/{eventId}/quizzes/{quizId}/questions",
            new { text = "2+2?", options = new[] { "3", "4", "5" }, correctIndex = 1 });
        await admin.PostAsJsonAsync($"/api/events/{eventId}/quizzes/{quizId}/questions",
            new { text = "Stolica PL?", options = new[] { "Kraków", "Warszawa" }, correctIndex = 1 });

        var participant = await ParticipantClientAsync(token);
        var take = await participant.GetFromJsonAsync<JsonElement>($"/api/me/quizzes/{quizId}");
        var questions = take.GetProperty("questions");
        Assert.Equal(2, questions.GetArrayLength());
        // Correct answers must not be exposed.
        Assert.False(questions[0].TryGetProperty("correctIndex", out _));

        var q1 = questions[0].GetProperty("id").GetGuid();
        var q2 = questions[1].GetProperty("id").GetGuid();
        var answers = new Dictionary<string, int> { [q1.ToString()] = 1, [q2.ToString()] = 0 }; // one correct

        var result = await (await participant.PostAsJsonAsync($"/api/me/quizzes/{quizId}/submit", answers))
            .Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, result.GetProperty("score").GetInt32());
    }

    [Fact]
    public async Task Networking_requires_consent_and_lists_contact()
    {
        var admin = await AdminAsync();
        var eventId = await EventAsync(admin);
        var (_, tokenA) = await ParticipantAsync(admin, eventId, networking: false);
        var (_, tokenB) = await ParticipantAsync(admin, eventId, networking: true);

        var a = await ParticipantClientAsync(tokenA);
        var add = await a.PostAsJsonAsync("/api/me/networking", new { targetToken = tokenB });
        add.EnsureSuccessStatusCode();

        var contacts = await a.GetFromJsonAsync<JsonElement>("/api/me/networking");
        Assert.Equal(1, contacts.GetArrayLength());
    }
}
