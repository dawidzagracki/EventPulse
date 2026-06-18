using EventPulse.Infrastructure.Outbox;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Infrastructure.Privacy;
using EventPulse.Shared.Multitenancy;
using EventPulse.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EventPulse.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddScoped<TenantContext>();
        services.AddScoped<ITenantContext>(sp => sp.GetRequiredService<TenantContext>());

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(
                connectionString,
                npgsql => npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.AddScoped<IOutboxDispatcher, OutboxDispatcher>();
        services.AddHostedService<OutboxProcessor>();
        services.AddHostedService<AnonymizationProcessor>();

        return services;
    }
}
