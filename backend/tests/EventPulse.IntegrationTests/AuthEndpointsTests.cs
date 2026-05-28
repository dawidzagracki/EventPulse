using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace EventPulse.IntegrationTests;

public class AuthEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AuthEndpointsTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Login_returns_tokens_for_seeded_admin()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@falp.local", password = "Admin123!" });

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("accessToken").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("refreshToken").GetString()));
        Assert.Equal("Agency", body.GetProperty("principalType").GetString());
    }

    [Fact]
    public async Task Login_with_wrong_password_returns_401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@falp.local", password = "wrong" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_requires_authentication()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_returns_claims_when_authenticated()
    {
        var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@falp.local", password = "Admin123!" });
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>();
        var accessToken = tokens.GetProperty("accessToken").GetString();

        client.DefaultRequestHeaders.Authorization = new("Bearer", accessToken);
        var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");

        Assert.Equal("admin@falp.local", me.GetProperty("email").GetString());
        Assert.Equal("Admin", me.GetProperty("role").GetString());
    }
}
