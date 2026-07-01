using System.Net.Http.Json;
using System.Text.Json;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Participants.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EventPulse.IntegrationTests;

public class PostEventTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public PostEventTests(ApiFactory factory) => _factory = factory;

    private async Task<HttpClient> AdminAsync()
    {
        var c = _factory.CreateClient();
        var login = await c.PostAsJsonAsync("/api/auth/login", new { email = "admin@falp.local", password = "Admin123!" });
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>();
        c.DefaultRequestHeaders.Authorization = new("Bearer", tokens.GetProperty("accessToken").GetString());
        return c;
    }

    [Fact]
    public async Task Feedback_then_summary_and_pdf_report()
    {
        var admin = await AdminAsync();
        var eventId = (await (await admin.PostAsJsonAsync("/api/events", new
        {
            name = $"Post {Guid.NewGuid():N}",
            clientEmail = "klient@test.local",
            startsAt = DateTimeOffset.UtcNow.AddDays(-1),
            endsAt = DateTimeOffset.UtcNow,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var email = $"fb-{Guid.NewGuid():N}@x.com";
        await admin.PostAsJsonAsync($"/api/events/{eventId}/participants",
            new { firstName = "Fee", lastName = "Back", email });

        Guid token;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            token = (await db.Set<Participant>().IgnoreQueryFilters().FirstAsync(p => p.Email == email)).AccessToken;
        }

        var participant = _factory.CreateClient();
        var session = await (await participant.PostAsJsonAsync("/api/auth/participant", new { token }))
            .Content.ReadFromJsonAsync<JsonElement>();
        participant.DefaultRequestHeaders.Authorization = new("Bearer", session.GetProperty("accessToken").GetString());

        var submit = await participant.PostAsJsonAsync("/api/me/feedback", new { rating = 5, comment = "Świetnie!" });
        submit.EnsureSuccessStatusCode();

        var summary = await admin.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}/feedback");
        Assert.Equal(1, summary.GetProperty("count").GetInt32());
        Assert.Equal(5, summary.GetProperty("average").GetDouble());

        var report = await admin.GetAsync($"/api/events/{eventId}/report");
        report.EnsureSuccessStatusCode();
        Assert.Equal("application/pdf", report.Content.Headers.ContentType?.MediaType);
        Assert.True((await report.Content.ReadAsByteArrayAsync()).Length > 500);
    }
}
