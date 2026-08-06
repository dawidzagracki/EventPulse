using System.Text.Json;
using EventPulse.Shared.Application;

namespace EventPulse.UnitTests;

/// <summary>
/// The audit log stores whole commands, so anything the redactor misses lands in the database in
/// clear text and is rendered back in the Audit tab.
/// </summary>
public class AuditRedactorTests
{
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = false };

    private static string Serialize(object request) =>
        AuditRedactor.Serialize(request, Options)!;

    private sealed record Login(string Email, string Password);

    [Fact]
    public void Masks_a_password_and_keeps_the_rest_of_the_trail()
    {
        var json = Serialize(new Login("admin@eventpulse.pl", "Dawid321z$"));

        Assert.DoesNotContain("Dawid321z", json);
        Assert.Contains("\"Password\":\"***\"", json);
        // Who signed in is exactly what an audit trail is for — that must survive.
        Assert.Contains("admin@eventpulse.pl", json);
    }

    private sealed record UpdateUser(string DisplayName, string? NewPassword);

    [Fact]
    public void Leaves_an_absent_password_null_instead_of_claiming_a_change()
    {
        // On UpdateAgencyUserCommand a null NewPassword means "password untouched". Masking it
        // would turn a rename into something that reads like a credential reset.
        var json = Serialize(new UpdateUser("Wiktoria", null));

        Assert.Contains("\"NewPassword\":null", json);
        Assert.DoesNotContain("***", json);
    }

    private sealed record ParticipantLogin(Guid Token);

    [Fact]
    public void Masks_a_participant_access_token()
    {
        // The access token IS the QR payload: whoever reads it in the log can sign in as that guest.
        var token = Guid.NewGuid();
        var json = Serialize(new ParticipantLogin(token));

        Assert.DoesNotContain(token.ToString(), json);
        Assert.Contains("\"Token\":\"***\"", json);
    }

    private sealed record ScanItem(Guid ClientId, Guid ParticipantToken, int Kind);

    [Fact]
    public void Masks_the_token_under_the_name_the_scanner_uses()
    {
        // BatchScanCommand calls it ParticipantToken, so matching only "token" left every scan
        // ever recorded holding a guest's QR payload in clear text.
        var token = Guid.NewGuid();
        var json = Serialize(new ScanItem(Guid.NewGuid(), token, 2));

        Assert.DoesNotContain(token.ToString(), json);
        Assert.Contains("\"ParticipantToken\":\"***\"", json);
        // The client id is the idempotency key, not a credential — it has to survive.
        Assert.Contains("ClientId", json);
    }

    private sealed record Item(string ClientId, string AccessToken);
    private sealed record Batch(Guid EventId, IReadOnlyList<Item> Items, Nested Meta);
    private sealed record Nested(string Secret, string Note);

    [Fact]
    public void Reaches_credentials_nested_in_arrays_and_objects()
    {
        var json = Serialize(new Batch(
            Guid.Empty,
            [new Item("scan-1", "leak-me"), new Item("scan-2", "leak-me-too")],
            new Nested("hunter2", "keep me")));

        Assert.DoesNotContain("leak-me", json);
        Assert.DoesNotContain("hunter2", json);
        // Non-sensitive neighbours at every depth stay readable.
        Assert.Contains("scan-1", json);
        Assert.Contains("scan-2", json);
        Assert.Contains("keep me", json);
    }

    [Fact]
    public void Matches_property_names_regardless_of_casing()
    {
        var json = Serialize(new Dictionary<string, string>
        {
            ["PASSWORD"] = "a",
            ["refreshtoken"] = "b",
            ["ApiKey"] = "c",
            ["description"] = "visible",
        });

        Assert.DoesNotContain("\"a\"", json);
        Assert.DoesNotContain("\"b\"", json);
        Assert.DoesNotContain("\"c\"", json);
        Assert.Contains("visible", json);
    }
}
