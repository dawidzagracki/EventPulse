using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace EventPulse.Modules.Ai;

/// <summary>Calls the Anthropic Messages API. Uses HttpClient; auth via x-api-key header.</summary>
public sealed class AnthropicAiAssistant : IAiAssistant
{
    private readonly HttpClient _http;
    private readonly AnthropicOptions _options;

    public AnthropicAiAssistant(HttpClient http, IOptions<AiOptions> options)
    {
        _http = http;
        _options = options.Value.Anthropic;
        _http.BaseAddress = new Uri(_options.BaseUrl);
        _http.DefaultRequestHeaders.TryAddWithoutValidation("x-api-key", _options.ApiKey);
        _http.DefaultRequestHeaders.TryAddWithoutValidation("anthropic-version", "2023-06-01");
    }

    public async Task<string> AnswerAsync(string systemPrompt, string userMessage, CancellationToken cancellationToken = default)
    {
        var body = new
        {
            model = _options.Model,
            max_tokens = _options.MaxTokens,
            system = systemPrompt,
            messages = new[] { new { role = "user", content = userMessage } },
        };

        using var response = await _http.PostAsJsonAsync("/v1/messages", body, cancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        if (json.TryGetProperty("content", out var content) && content.GetArrayLength() > 0)
        {
            return content[0].GetProperty("text").GetString() ?? string.Empty;
        }

        return string.Empty;
    }
}
