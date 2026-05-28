using System.Linq.Expressions;
using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Domain;
using EventPulse.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    private readonly ITenantContext _tenant;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenant)
        : base(options)
    {
        _tenant = tenant;
    }

    public DbSet<Event> Events => Set<Event>();

    /// <summary>
    /// Referenced by the per-entity tenant query filter. Public so EF can read it on the context
    /// instance at query-execution time (re-evaluated for every query, never baked in).
    /// </summary>
    public Guid CurrentTenantId => _tenant.TenantId;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        ApplyTenantQueryFilters(modelBuilder);
    }

    /// <summary>
    /// Adds <c>e =&gt; e.TenantId == CurrentTenantId</c> to every <see cref="TenantEntity"/>.
    /// Automatic so no query can ever forget tenant isolation. Enforced by ArchitectureTests.
    /// </summary>
    private void ApplyTenantQueryFilters(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!typeof(TenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                continue;
            }

            var parameter = Expression.Parameter(entityType.ClrType, "e");
            var tenantId = Expression.Property(parameter, nameof(TenantEntity.TenantId));
            var currentTenant = Expression.Property(Expression.Constant(this), nameof(CurrentTenantId));
            var filter = Expression.Lambda(Expression.Equal(tenantId, currentTenant), parameter);
            modelBuilder.Entity(entityType.ClrType).HasQueryFilter(filter);
        }
    }

    public override int SaveChanges()
    {
        ApplyTenantStampAndAudit();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyTenantStampAndAudit();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyTenantStampAndAudit()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries<TenantEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    if (entry.Entity.TenantId == Guid.Empty)
                    {
                        entry.Entity.TenantId = _tenant.TenantId;
                    }

                    entry.Entity.CreatedAt = now;
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    entry.Property(nameof(TenantEntity.TenantId)).IsModified = false; // tenant is immutable
                    break;
            }
        }
    }
}
