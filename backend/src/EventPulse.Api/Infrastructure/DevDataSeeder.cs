using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Identity.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace EventPulse.Api.Infrastructure;

/// <summary>
/// Applies pending migrations and seeds the first agency + admin:
/// • Development → a ready-to-use demo admin (admin@falp.local).
/// • Production → bootstraps the first agency + admin from <c>Bootstrap:*</c> config, but ONLY
///   when the database is still empty (never overwrites an existing tenant).
/// </summary>
public static class DevDataSeeder
{
    public static async Task MigrateAndSeedAsync(IServiceProvider services, bool seedDevData)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        if (seedDevData)
        {
            await SeedDevAsync(db, hasher);
            return;
        }

        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        await BootstrapAdminAsync(db, hasher, config);
    }

    private static async Task SeedDevAsync(AppDbContext db, IPasswordHasher hasher)
    {
        if (await db.Set<Tenant>().AnyAsync())
        {
            return;
        }

        var tenant = new Tenant { Name = "FALP Event", CreatedAt = DateTimeOffset.UtcNow };
        db.Set<Tenant>().Add(tenant);
        db.Set<User>().Add(new User
        {
            TenantId = tenant.Id,
            Email = "admin@falp.local",
            PasswordHash = hasher.Hash("Admin123!"),
            DisplayName = "FALP Admin",
            Role = UserRole.Admin,
        });

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Creates the very first agency + super-admin from configuration when the DB is fresh.
    /// Set <c>Bootstrap__AdminEmail</c> and <c>Bootstrap__AdminPassword</c> (env) on first deploy.
    /// Idempotent: does nothing once any tenant exists, so it's safe to leave the vars in place.
    /// </summary>
    private static async Task BootstrapAdminAsync(AppDbContext db, IPasswordHasher hasher, IConfiguration config)
    {
        var email = config["Bootstrap:AdminEmail"];
        var password = config["Bootstrap:AdminPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return; // no bootstrap requested
        }

        if (await db.Set<Tenant>().AnyAsync())
        {
            return; // already initialised — never overwrite
        }

        var tenant = new Tenant
        {
            Name = config["Bootstrap:TenantName"] ?? "EventPulse",
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.Set<Tenant>().Add(tenant);
        db.Set<User>().Add(new User
        {
            TenantId = tenant.Id,
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = hasher.Hash(password),
            DisplayName = config["Bootstrap:AdminName"] ?? "Administrator",
            Role = UserRole.Admin,
        });

        await db.SaveChangesAsync();
    }
}
