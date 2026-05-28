using EventPulse.Shared.Notifications;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EventPulse.Infrastructure.Email;

public static class EmailServiceCollectionExtensions
{
    public static IServiceCollection AddEmail(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));

        var provider = configuration.GetSection(EmailOptions.SectionName)["Provider"] ?? "Smtp";

        if (provider.Equals("Mailgun", StringComparison.OrdinalIgnoreCase))
        {
            services.AddHttpClient<IEmailSender, MailgunEmailSender>();
        }
        else
        {
            services.AddScoped<IEmailSender, SmtpEmailSender>();
        }

        return services;
    }
}
