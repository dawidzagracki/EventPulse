using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EventPulse.Modules.Ai;

public static class DependencyInjection
{
    public static IServiceCollection AddAiModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AiOptions>(configuration.GetSection(AiOptions.SectionName));

        var provider = configuration.GetSection(AiOptions.SectionName)["Provider"] ?? "Stub";
        if (provider.Equals("Anthropic", StringComparison.OrdinalIgnoreCase))
        {
            services.AddHttpClient<IAiAssistant, AnthropicAiAssistant>();
        }
        else
        {
            services.AddSingleton<IAiAssistant, StubAiAssistant>();
        }

        return services;
    }
}
