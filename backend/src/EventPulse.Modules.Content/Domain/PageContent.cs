using System.Text.Json;
using System.Text.Json.Nodes;
using EventPulse.Shared.Application;

namespace EventPulse.Modules.Content.Domain;

/// <summary>
/// Helpers over the page's JSON document: <c>{ "blocks": [ { id, type, order, visible,
/// settings, content: { pl, en }, styles: { ..., customCSS } } ] }</c>.
/// </summary>
public static class PageContent
{
    public const string Empty = """{"blocks":[]}""";

    /// <summary>Max stored content size (1 MB) to bound payloads.</summary>
    public const int MaxBytes = 1_048_576;

    public sealed class InvalidPageContentException(string message) : AppException(message)
    {
        public override int StatusCode => 400;
    }

    /// <summary>Validates structure and sanitizes every block's customCSS. Returns canonical JSON.</summary>
    public static string ValidateAndSanitize(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return Empty;
        }

        if (System.Text.Encoding.UTF8.GetByteCount(json) > MaxBytes)
        {
            throw new InvalidPageContentException("Page content exceeds the maximum allowed size.");
        }

        JsonNode? root;
        try
        {
            root = JsonNode.Parse(json);
        }
        catch (JsonException ex)
        {
            throw new InvalidPageContentException($"Invalid JSON: {ex.Message}");
        }

        if (root is not JsonObject obj || obj["blocks"] is not JsonArray blocks)
        {
            throw new InvalidPageContentException("Page content must be an object with a 'blocks' array.");
        }

        foreach (var block in blocks)
        {
            if (block is not JsonObject blockObj)
            {
                throw new InvalidPageContentException("Each block must be an object.");
            }

            if (blockObj["type"] is null)
            {
                throw new InvalidPageContentException("Each block must have a 'type'.");
            }

            if (blockObj["styles"] is JsonObject styles && styles["customCSS"] is JsonValue cssValue
                && cssValue.TryGetValue<string>(out var css))
            {
                styles["customCSS"] = CssSanitizer.Sanitize(css);
            }
        }

        return obj.ToJsonString();
    }
}
