using EventPulse.Infrastructure.Persistence;
using EventPulse.Shared.Domain;
using EventPulse.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.ArchitectureTests;

/// <summary>
/// Guards the single most important security invariant: every tenant-scoped entity must carry a
/// global query filter. If someone adds an entity deriving from <see cref="TenantEntity"/> without
/// one, this test fails the build — preventing cross-tenant data leaks.
/// </summary>
public class TenantIsolationModelTests
{
    private static AppDbContext BuildModelOnlyContext()
    {
        // A valid connection string is needed to build the model, but no connection is opened here.
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=model_only;Username=u;Password=p")
            .Options;
        return new AppDbContext(options, new TenantContext());
    }

    [Fact]
    public void Every_tenant_entity_has_a_global_query_filter()
    {
        using var context = BuildModelOnlyContext();

        var offenders = context.Model.GetEntityTypes()
            .Where(t => typeof(TenantEntity).IsAssignableFrom(t.ClrType))
            .Where(t => !t.GetDeclaredQueryFilters().Any())
            .Select(t => t.ClrType.Name)
            .ToList();

        Assert.True(
            offenders.Count == 0,
            $"Tenant-scoped entities without a query filter (cross-tenant leak risk): {string.Join(", ", offenders)}");
    }

    [Fact]
    public void There_is_at_least_one_tenant_entity_mapped()
    {
        using var context = BuildModelOnlyContext();

        var tenantEntities = context.Model.GetEntityTypes()
            .Count(t => typeof(TenantEntity).IsAssignableFrom(t.ClrType));

        Assert.True(tenantEntities > 0, "Expected at least one tenant-scoped entity in the model.");
    }
}
