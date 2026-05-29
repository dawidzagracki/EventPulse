namespace EventPulse.Modules.Ai;

public sealed class AiOptions
{
    public const string SectionName = "Ai";

    /// <summary>"Stub" (no external calls — default for local/tests) or "Anthropic".</summary>
    public string Provider { get; set; } = "Stub";
    public AnthropicOptions Anthropic { get; set; } = new();
}

public sealed class AnthropicOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "claude-opus-4-7";
    public string BaseUrl { get; set; } = "https://api.anthropic.com";
    public int MaxTokens { get; set; } = 600;
}

public interface IAiAssistant
{
    Task<string> AnswerAsync(string systemPrompt, string userMessage, CancellationToken cancellationToken = default);
}

public sealed class StubAiAssistant : IAiAssistant
{
    public Task<string> AnswerAsync(string systemPrompt, string userMessage, CancellationToken cancellationToken = default)
        => Task.FromResult(
            "(asystent offline) Pomogę gdy zostanie skonfigurowany klucz Claude API. " +
            "Tymczasem sprawdź agendę i sekcję logistyki w aplikacji.");
}
