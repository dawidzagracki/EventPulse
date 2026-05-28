using System.Collections.Concurrent;
using EventPulse.Infrastructure.Outbox;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Shared.Notifications;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Testcontainers.PostgreSql;

namespace EventPulse.IntegrationTests;

/// <summary>
/// Boots the real API host against a throwaway PostgreSQL container, in the Development environment
/// so the default agency + admin are seeded. The DbContext is hard-swapped to the container (config
/// overrides alone are unreliable under the minimal-hosting model), guaranteeing test isolation.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine").Build();

    /// <summary>Emails "sent" during a test, captured by the fake sender.</summary>
    public ConcurrentQueue<EmailMessage> SentEmails { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Development);

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "integration-test-signing-key-0123456789-0123456789",
            });
        });

        builder.ConfigureTestServices(services =>
        {
            var descriptors = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>)
                            || d.ServiceType == typeof(DbContextOptions))
                .ToList();
            foreach (var descriptor in descriptors)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(_postgres.GetConnectionString()));

            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(new FakeEmailSender(SentEmails));

            // Disable the background outbox loop; tests drain it deterministically via IOutboxDispatcher.
            var processor = services.FirstOrDefault(d => d.ImplementationType == typeof(OutboxProcessor));
            if (processor is not null)
            {
                services.Remove(processor);
            }
        });
    }

    private sealed class FakeEmailSender(ConcurrentQueue<EmailMessage> sent) : IEmailSender
    {
        public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            sent.Enqueue(message);
            return Task.CompletedTask;
        }
    }

    async Task IAsyncLifetime.InitializeAsync() => await _postgres.StartAsync();

    async Task IAsyncLifetime.DisposeAsync()
    {
        await _postgres.DisposeAsync();
        await base.DisposeAsync();
    }
}
