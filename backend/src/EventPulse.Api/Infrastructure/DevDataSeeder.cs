using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Identity.Domain;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Api.Infrastructure;

/// <summary>
/// Applies pending migrations and, in Development only, seeds a default agency + admin so the app
/// is usable immediately. Production seeds the first agency manually (per spec).
/// </summary>
public static class DevDataSeeder
{
    public static async Task MigrateAndSeedAsync(IServiceProvider services, bool seedDevData)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        if (!seedDevData)
        {
            return;
        }

        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

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
}
