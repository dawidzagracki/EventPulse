using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Identity.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EventPulse.IntegrationTests;

public class EventsEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public EventsEndpointsTests(ApiFactory factory) => _factory = factory;

    private async Task<HttpClient> AuthedClientAsync(string email, string password)
    {
        var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        login.EnsureSuccessStatusCode();
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization = new("Bearer", tokens.GetProperty("accessToken").GetString());
        return client;
    }

    private static object NewEventBody(string name) => new
    {
        name,
        startsAt = DateTimeOffset.UtcNow.AddDays(30),
        clientEmail = "klient@test.local",
        endsAt = DateTimeOffset.UtcNow.AddDays(31),
        location = "Warszawa",
        defaultLanguage = "pl",
    };

    [Fact]
    public async Task Requires_authentication()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/events");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_then_get_and_list()
    {
        var client = await AuthedClientAsync("admin@falp.local", "Admin123!");

        var create = await client.PostAsJsonAsync("/api/events", NewEventBody("Gala Firmowa 2026"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetGuid();
        Assert.StartsWith("gala-firmowa-2026", created.GetProperty("slug").GetString());

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/events/{id}");
        Assert.Equal("Gala Firmowa 2026", get.GetProperty("name").GetString());

        var list = await client.GetFromJsonAsync<JsonElement>("/api/events");
        Assert.Contains(list.EnumerateArray(), e => e.GetProperty("id").GetGuid() == id);
    }

    [Fact]
    public async Task Status_transition_enforced()
    {
        var client = await AuthedClientAsync("admin@falp.local", "Admin123!");
        var create = await client.PostAsJsonAsync("/api/events", NewEventBody("Konferencja"));
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        // Draft -> Published is allowed.
        var ok = await client.PostAsJsonAsync($"/api/events/{id}/status", new { newStatus = 1 });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        // Published -> Archived is not allowed.
        var bad = await client.PostAsJsonAsync($"/api/events/{id}/status", new { newStatus = 4 });
        Assert.Equal(HttpStatusCode.Conflict, bad.StatusCode);
    }

    [Fact]
    public async Task Events_are_isolated_between_tenants()
    {
        await SeedSecondAgencyAsync();

        var agencyA = await AuthedClientAsync("admin@falp.local", "Admin123!");
        var create = await agencyA.PostAsJsonAsync("/api/events", NewEventBody("Tenant A Only"));
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var agencyB = await AuthedClientAsync("b-admin@test.local", "Pass123!");
        var bList = await agencyB.GetFromJsonAsync<JsonElement>("/api/events");
        Assert.DoesNotContain(bList.EnumerateArray(), e => e.GetProperty("id").GetGuid() == id);

        // B cannot fetch A's event by id either.
        var bGet = await agencyB.GetAsync($"/api/events/{id}");
        Assert.Equal(HttpStatusCode.NotFound, bGet.StatusCode);
    }

    private async Task SeedSecondAgencyAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        if (await db.Set<User>().IgnoreQueryFilters().AnyAsync(u => u.Email == "b-admin@test.local"))
        {
            return;
        }

        var tenant = new Tenant { Name = "Second Agency", CreatedAt = DateTimeOffset.UtcNow };
        db.Set<Tenant>().Add(tenant);
        db.Set<User>().Add(new User
        {
            TenantId = tenant.Id,
            Email = "b-admin@test.local",
            PasswordHash = hasher.Hash("Pass123!"),
            DisplayName = "B Admin",
            Role = UserRole.Admin,
        });
        await db.SaveChangesAsync();
    }
}
