using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace EventPulse.IntegrationTests;

/// <summary>
/// End-to-end proof against a real PostgreSQL (via Testcontainers) that the global query filter
/// isolates tenants and that TenantId is stamped automatically on insert.
/// </summary>
public class TenantIsolationTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .Build();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        await using var context = CreateContext(Guid.NewGuid());
        await context.Database.MigrateAsync();
    }

    public async Task DisposeAsync() => await _postgres.DisposeAsync();

    private AppDbContext CreateContext(Guid tenantId)
    {
        var tenant = new TenantContext();
        tenant.SetTenant(tenantId);

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;

        return new AppDbContext(options, tenant);
    }

    private static Event NewEvent(string name) => new()
    {
        Name = name,
        Slug = $"{name.ToLowerInvariant()}-{Guid.NewGuid():N}",
        StartsAt = DateTimeOffset.UtcNow,
        EndsAt = DateTimeOffset.UtcNow.AddHours(4),
    };

    [Fact]
    public async Task Tenant_cannot_read_another_tenants_events()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        await using (var ctxA = CreateContext(tenantA))
        {
            ctxA.Events.Add(NewEvent("GalaA"));
            await ctxA.SaveChangesAsync();
        }

        await using (var ctxB = CreateContext(tenantB))
        {
            Assert.Empty(await ctxB.Events.ToListAsync());
        }

        await using (var ctxA2 = CreateContext(tenantA))
        {
            Assert.Single(await ctxA2.Events.ToListAsync());
        }
    }

    [Fact]
    public async Task TenantId_is_stamped_automatically_on_insert()
    {
        var tenant = Guid.NewGuid();
        await using var context = CreateContext(tenant);

        var ev = NewEvent("Conf");
        context.Events.Add(ev);
        await context.SaveChangesAsync();

        Assert.Equal(tenant, ev.TenantId);
    }
}
