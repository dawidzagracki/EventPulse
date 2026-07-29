using EventPulse.Modules.Participants.Application.Invitations;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;

namespace EventPulse.UnitTests;

public class EntryQrEmailTests
{
    private static Participant Guest() => new()
    {
        FirstName = "Anna",
        LastName = "Kowalska",
        Email = "anna@example.com",
        EntryOnly = true,
    };

    private static EmailMessage Build(Participant guest) => EntryQrEmail.Build(
        guest,
        "Kermi Grand Opening",
        new DateTimeOffset(2026, 7, 30, 12, 30, 0, TimeSpan.Zero),
        "wyspa Słodowa 7, 50-266 Wrocław",
        $"https://eventpulse.pl/p/{guest.AccessToken}");

    [Fact]
    public void Embeds_the_qr_inline_and_attaches_it_for_offline_use()
    {
        var message = Build(Guest());

        Assert.NotNull(message.Attachments);
        Assert.Equal(2, message.Attachments!.Count);

        // One inline copy, referenced from the body, so the guest sees the code immediately.
        var inline = Assert.Single(message.Attachments, a => a.ContentId is not null);
        Assert.Equal("image/png", inline.ContentType);
        // Content-id must equal the file name: MailKit matches on content-id, Mailgun on file name.
        Assert.Equal(inline.FileName, inline.ContentId);
        Assert.Contains($"cid:{inline.ContentId}", message.HtmlBody);

        // …and one downloadable copy for the door, where there may be no signal.
        var download = Assert.Single(message.Attachments, a => a.ContentId is null);
        Assert.Equal("image/png", download.ContentType);

        // Both carry a real PNG (89 50 4E 47 magic bytes).
        foreach (var attachment in message.Attachments)
        {
            Assert.True(attachment.Content.Length > 100);
            Assert.Equal(new byte[] { 0x89, 0x50, 0x4E, 0x47 }, attachment.Content.Take(4).ToArray());
        }
    }

    [Fact]
    public void Is_bilingual_and_does_not_push_the_guest_towards_the_app()
    {
        var message = Build(Guest());

        Assert.Contains("Twój kod QR", message.Subject);
        Assert.Contains("Your QR code", message.Subject);
        Assert.Contains("Pokaż go przy wejściu", message.HtmlBody);
        Assert.Contains("Show it at the entrance", message.HtmlBody);
        Assert.Contains("wyspa Słodowa 7", message.HtmlBody);
        // No "open the event page" call to action — that's what the invitation e-mail is for.
        Assert.DoesNotContain("Otwórz stronę wydarzenia", message.HtmlBody);
    }

    [Fact]
    public void Encodes_the_same_payload_as_every_other_qr_in_the_system()
    {
        var guest = Guest();
        Assert.Equal(
            $"https://eventpulse.pl/p/{guest.AccessToken}",
            SendEntryQrHandler.BuildLink("https://eventpulse.pl/p/", guest.AccessToken));
    }

    /// <summary>
    /// Writes the rendered mail out so it can be opened in a browser / decoded during review.
    /// Set EP_MAIL_DUMP to a directory to enable; otherwise this is a no-op.
    /// </summary>
    [Fact]
    public void Dump_for_manual_review()
    {
        var dir = Environment.GetEnvironmentVariable("EP_MAIL_DUMP");
        if (string.IsNullOrWhiteSpace(dir))
        {
            return;
        }

        var message = Build(Guest());
        Directory.CreateDirectory(dir);
        var inline = message.Attachments!.First(a => a.ContentId is not null);
        // Inline the PNG as a data URI so the dumped file previews standalone in a browser.
        var preview = message.HtmlBody.Replace(
            $"cid:{inline.ContentId}",
            $"data:image/png;base64,{Convert.ToBase64String(inline.Content)}");
        File.WriteAllText(Path.Combine(dir, "entry-qr-email.html"), preview);
        File.WriteAllBytes(Path.Combine(dir, "entry-qr.png"), inline.Content);
        File.WriteAllText(Path.Combine(dir, "entry-qr-subject.txt"), message.Subject);
    }
}
