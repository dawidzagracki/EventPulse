using Microsoft.EntityFrameworkCore;

namespace EventPulse.Shared.Persistence;

/// <summary>
/// Data-access seam exposed to feature modules so they never reference the Infrastructure project
/// directly (keeps dependencies pointing inward). Implemented by the EF Core AppDbContext.
/// </summary>
public interface IAppDbContext
{
    DbSet<T> Set<T>() where T : class;

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
