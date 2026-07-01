using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace EventPulse.IntegrationTests;

public class PageBuilderEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public PageBuilderEndpointsTests(ApiFactory factory) => _factory = factory;

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
            name = $"PageEvent {Guid.NewGuid():N}",
            clientEmail = "klient@test.local",
            startsAt = DateTimeOffset.UtcNow.AddDays(20),
            endsAt = DateTimeOffset.UtcNow.AddDays(21),
        });
        return (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task Template_save_sanitize_publish_and_public_render()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);

        // Empty by default.
        var draft = await admin.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}/page");
        Assert.Equal(0, draft.GetProperty("content").GetProperty("blocks").GetArrayLength());

        // Apply a template.
        var templated = await admin.PostAsync($"/api/events/{eventId}/page/template/gala", null);
        templated.EnsureSuccessStatusCode();
        var afterTemplate = await templated.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(afterTemplate.GetProperty("content").GetProperty("blocks").GetArrayLength() > 1);

        // Save a draft with malicious custom CSS — must be sanitized server-side.
        var malicious = JsonDocument.Parse("""
            {"blocks":[{"id":"b1","type":"hero","styles":{"customCSS":"h1{background:expression(alert(1))}"}}]}
            """).RootElement;
        var saved = await admin.PutAsJsonAsync($"/api/events/{eventId}/page", malicious);
        saved.EnsureSuccessStatusCode();
        var afterSave = await saved.Content.ReadFromJsonAsync<JsonElement>();
        var css = afterSave.GetProperty("content").GetProperty("blocks")[0]
            .GetProperty("styles").GetProperty("customCSS").GetString();
        Assert.DoesNotContain("expression(", css, StringComparison.OrdinalIgnoreCase);

        // Not published yet → public render 404.
        var beforePublish = await _factory.CreateClient().GetAsync($"/api/public/events/{eventId}/page");
        Assert.Equal(HttpStatusCode.NotFound, beforePublish.StatusCode);

        // Publish → version 1.
        var publish = await admin.PostAsync($"/api/events/{eventId}/page/publish", null);
        publish.EnsureSuccessStatusCode();
        Assert.Equal(1, (await publish.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("publishedVersion").GetInt32());

        // Public render now returns the published snapshot.
        var published = await _factory.CreateClient().GetFromJsonAsync<JsonElement>($"/api/public/events/{eventId}/page");
        Assert.Equal(1, published.GetProperty("version").GetInt32());
        Assert.Equal(1, published.GetProperty("content").GetProperty("blocks").GetArrayLength());

        // Versions list contains v1.
        var versions = await admin.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}/page/versions");
        Assert.Contains(versions.EnumerateArray(), v => v.GetProperty("version").GetInt32() == 1);
    }

    [Fact]
    public async Task Invalid_page_content_is_rejected()
    {
        var admin = await AdminClientAsync();
        var eventId = await CreateEventAsync(admin);

        var invalid = JsonDocument.Parse("""{"foo":123}""").RootElement;
        var resp = await admin.PutAsJsonAsync($"/api/events/{eventId}/page", invalid);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }
}
