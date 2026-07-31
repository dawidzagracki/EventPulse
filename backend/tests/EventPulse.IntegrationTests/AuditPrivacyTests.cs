using System.Net.Http.Json;
using System.Text.Json;

namespace EventPulse.IntegrationTests;

/// <summary>
/// The audit log serialises whole commands, so any command carrying a credential can leak it into
/// the database — and straight back out through the Audit tab, which renders the payload verbatim.
/// </summary>
public class AuditPrivacyTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AuditPrivacyTests(ApiFactory factory) => _factory = factory;

    private async Task<HttpClient> AdminAsync()
    {
        var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@falp.local", password = "Admin123!" });
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization =
            new("Bearer", tokens.GetProperty("accessToken").GetString());
        return client;
    }

    [Fact]
    public async Task A_password_never_reaches_the_audit_log()
    {
        const string password = "Sekret-Do-Wycieku-123!";
        var client = await AdminAsync();
        var email = $"audit-{Guid.NewGuid():N}@falp.local";

        var created = await client.PostAsJsonAsync("/api/team/admins", new
        {
            email,
            displayName = "Audit Probe",
            password,
            role = "Admin",
        });
        created.EnsureSuccessStatusCode();

        // Read it the way the Audit tab does — whatever that endpoint returns is what a human sees.
        var raw = await client.GetStringAsync("/api/audit?take=200");
        Assert.DoesNotContain(password, raw);

        var entries = await client.GetFromJsonAsync<JsonElement>("/api/audit?take=200");
        var entry = entries.EnumerateArray().First(e =>
            e.GetProperty("action").GetString() == "CreateAgencyUserCommand");
        // Parse rather than string-match: the column is jsonb, so Postgres hands the payload back
        // re-serialised — keys reordered and spaced — and any literal comparison is a false failure.
        var payload = JsonDocument.Parse(entry.GetProperty("payload").GetString()!).RootElement;

        // The trail still says who created which account — only the credential is gone.
        Assert.Equal(email, payload.GetProperty("Email").GetString());
        Assert.Equal("***", payload.GetProperty("Password").GetString());
    }
}
