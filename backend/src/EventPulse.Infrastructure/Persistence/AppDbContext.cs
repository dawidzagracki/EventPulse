using System.Linq.Expressions;
using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Domain;
using EventPulse.Shared.Multitenancy;
using EventPulse.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext, IAppDbContext
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
        WriteOutboxMessages();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyTenantStampAndAudit();
        WriteOutboxMessages();
        return base.SaveChangesAsync(cancellationToken);
    }

    // Persists raised domain events as outbox rows in the same transaction as the change.
    private void WriteOutboxMessages()
    {
        var aggregates = ChangeTracker.Entries<AggregateRoot>()
            .Where(e => e.Entity.DomainEvents.Count > 0)
            .Select(e => e.Entity)
            .ToList();

        foreach (var aggregate in aggregates)
        {
            foreach (var domainEvent in aggregate.DomainEvents)
            {
                var type = domainEvent.GetType();
                Set<Outbox.OutboxMessage>().Add(new Outbox.OutboxMessage
                {
                    Type = type.AssemblyQualifiedName!,
                    Content = System.Text.Json.JsonSerializer.Serialize(domainEvent, type),
                    OccurredAt = DateTimeOffset.UtcNow,
                });
            }

            aggregate.ClearDomainEvents();
        }
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
