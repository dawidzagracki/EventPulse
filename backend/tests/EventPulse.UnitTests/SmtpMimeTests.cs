using EventPulse.Infrastructure.Email;
using EventPulse.Shared.Notifications;
using MimeKit;

namespace EventPulse.UnitTests;

/// <summary>
/// The QR e-mail only works if the MIME comes out right: mail clients render an inline image only
/// when it lives in a multipart/related part and its Content-ID matches the cid: in the HTML.
/// These assert that structure without needing an SMTP server.
/// </summary>
public class SmtpMimeTests
{
    private static readonly EmailOptions Options = new()
    {
        From = "no-reply@eventpulse.pl",
        FromName = "EventPulse",
    };

    private static EmailMessage WithQr() => new(
        "guest@example.com",
        "Anna Kowalska",
        "Twój kod QR",
        "<p>Hi</p><img src=\"cid:qr.png\" />",
        "Hi",
        null,
        [
            new EmailAttachment("qr.png", "image/png", [1, 2, 3, 4], "qr.png"),
            new EmailAttachment("kod-qr.png", "image/png", [1, 2, 3, 4]),
        ]);

    [Fact]
    public void Inline_image_is_related_to_the_html_and_carries_a_matching_content_id()
    {
        var mime = SmtpEmailSender.BuildMime(WithQr(), Options);

        var images = mime.BodyParts.OfType<MimePart>()
            .Where(p => p.ContentType.MimeType == "image/png")
            .ToList();
        Assert.Equal(2, images.Count);

        var inline = Assert.Single(images, p => p.ContentDisposition?.Disposition == ContentDisposition.Inline);
        // MimeKit stores content-ids without the angle brackets it puts on the wire.
        Assert.Equal("qr.png", inline.ContentId);
        Assert.Contains($"cid:{inline.ContentId}", mime.HtmlBody);

        // The inline image must sit in a multipart/related together with the HTML; anywhere else
        // and clients show it as a stray attachment instead of rendering it.
        var related = Assert.IsType<MultipartRelated>(FindRelated(mime.Body));
        Assert.Contains(inline, related.OfType<MimePart>());

        var download = Assert.Single(images, p => p.ContentDisposition?.Disposition == ContentDisposition.Attachment);
        Assert.Equal("kod-qr.png", download.FileName);
    }

    [Fact]
    public void Round_trips_through_the_wire_format_with_the_content_id_intact()
    {
        using var stream = new MemoryStream();
        SmtpEmailSender.BuildMime(WithQr(), Options).WriteTo(stream);
        stream.Position = 0;
        var parsed = MimeMessage.Load(stream);

        // On the wire the content-id is angle-bracketed — that is what the cid: URI resolves against.
        // (MimeKit spells the header "Content-Id"; the header name is case-insensitive per RFC 822.)
        Assert.Contains(
            "content-id: <qr.png>",
            System.Text.Encoding.ASCII.GetString(stream.ToArray()).ToLowerInvariant());

        // The inline image must be inside the multipart/related that also holds the HTML.
        Assert.Contains("multipart/related", System.Text.Encoding.ASCII.GetString(stream.ToArray()));

        var inline = Assert.Single(
            parsed.BodyParts.OfType<MimePart>(),
            p => p.ContentId == "qr.png");
        Assert.Equal("image/png", inline.ContentType.MimeType);
        Assert.Equal(new byte[] { 1, 2, 3, 4 }, ReadAll(inline));
    }

    [Fact]
    public void Plain_messages_stay_plain()
    {
        var mime = SmtpEmailSender.BuildMime(
            new EmailMessage("a@b.c", "A", "s", "<p>x</p>", "x"), Options);

        Assert.Empty(mime.BodyParts.OfType<MimePart>().Where(p => p.ContentType.MimeType.StartsWith("image/")));
        Assert.Equal("EventPulse", mime.From.Mailboxes.Single().Name);
    }

    [Fact]
    public void Per_message_sender_name_overrides_the_default()
    {
        var mime = SmtpEmailSender.BuildMime(
            new EmailMessage("a@b.c", "A", "s", "<p>x</p>", "x", "Kermi"), Options);

        var from = mime.From.Mailboxes.Single();
        Assert.Equal("Kermi", from.Name);
        Assert.Equal("no-reply@eventpulse.pl", from.Address); // the address itself never changes
    }

    [Fact]
    public void Dump_wire_format()
    {
        var dir = Environment.GetEnvironmentVariable("EP_MAIL_DUMP");
        if (string.IsNullOrWhiteSpace(dir))
        {
            return;
        }

        Directory.CreateDirectory(dir);
        using var file = File.Create(Path.Combine(dir, "qr-mail.eml"));
        SmtpEmailSender.BuildMime(WithQr(), Options).WriteTo(file);
    }

    private static MimeEntity? FindRelated(MimeEntity entity) => entity switch
    {
        MultipartRelated related => related,
        Multipart multipart => multipart.Select(FindRelated).FirstOrDefault(found => found is not null),
        _ => null,
    };

    private static byte[] ReadAll(MimePart part)
    {
        using var ms = new MemoryStream();
        part.Content.DecodeTo(ms);
        return ms.ToArray();
    }
}
