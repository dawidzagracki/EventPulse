using System.Text.Json;
using System.Text.Json.Nodes;

namespace EventPulse.Shared.Application;

/// <summary>
/// Strips credentials out of an audit payload before it is stored.
///
/// The audit log serialises the whole command, so <c>LoginCommand</c> wrote the operator's password
/// to the database in clear text — and the Audit tab rendered it back to anyone who could open it.
/// An audit trail records that somebody signed in, never what they typed to do it.
///
/// Matching is by property name and recursive, because a command can nest objects and arrays.
/// </summary>
public static class AuditRedactor
{
    public const string Mask = "***";

    private static readonly HashSet<string> Sensitive = new(StringComparer.OrdinalIgnoreCase)
    {
        "password",
        "newPassword",
        "currentPassword",
        "confirmPassword",
        // A participant's access token IS the QR payload: whoever reads it can sign in as that guest.
        "token",
        "accessToken",
        "refreshToken",
        "secret",
        "clientSecret",
        "apiKey",
    };

    /// <summary>Serialises a command for the audit log with every credential masked.</summary>
    public static string? Serialize<T>(T request, JsonSerializerOptions options)
    {
        try
        {
            var node = JsonSerializer.SerializeToNode(request, options);
            Redact(node);
            return node?.ToJsonString(options);
        }
        catch
        {
            return null;
        }
    }

    private static void Redact(JsonNode? node)
    {
        switch (node)
        {
            case JsonObject obj:
                // Materialise the keys first — assigning into the object while enumerating it throws.
                foreach (var key in obj.Select(property => property.Key).ToList())
                {
                    if (!Sensitive.Contains(key))
                    {
                        Redact(obj[key]);
                    }
                    else if (obj[key] is not null)
                    {
                        // A null stays null: on UpdateAgencyUserCommand it means "password untouched",
                        // and masking it would claim a change that never happened.
                        obj[key] = Mask;
                    }
                }

                break;

            case JsonArray array:
                foreach (var item in array)
                {
                    Redact(item);
                }

                break;
        }
    }
}
