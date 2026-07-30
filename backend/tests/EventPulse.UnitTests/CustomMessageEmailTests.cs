using EventPulse.Modules.Participants.Application.Invitations;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;

namespace EventPulse.UnitTests;

public class CustomMessageEmailTests
{
    private static Participant Guest(string language = "pl") => new()
    {
        FirstName = "Anna",
        LastName = "Kowalska",
        Email = "anna@example.com",
        Language = language,
    };

    private static EmailMessage Build(
        Participant guest,
        string bodyPl = "Autokar czeka przed wejściem.",
        string? subjectEn = null,
        string? bodyEn = null,
        EmailBrand? brand = null) =>
        CustomMessageEmail.Build(
            guest, "Autokar podstawiony", bodyPl, subjectEn, bodyEn, "https://eventpulse.pl/p/x", brand);

    [Fact]
    public void Encodes_whatever_the_organiser_typed()
    {
        // EmailContent.Paragraphs is rendered as trusted HTML — every other builder puts markup
        // there by hand. This is the only mail carrying free text, so an unencoded "<" would
        // swallow the rest of the message, and a pasted tag would render as markup.
        var message = Build(Guest(), bodyPl: "Cena <b>500</b> zł & więcej <script>alert(1)</script>");

        Assert.Contains("&lt;b&gt;500&lt;/b&gt;", message.HtmlBody);
        Assert.Contains("&lt;script&gt;", message.HtmlBody);
        Assert.DoesNotContain("<script>", message.HtmlBody);
        Assert.DoesNotContain("<b>500</b>", message.HtmlBody);
        Assert.Contains("&amp;", message.HtmlBody);
    }

    [Fact]
    public void Turns_line_breaks_into_markup_without_letting_text_become_markup()
    {
        var message = Build(Guest(), bodyPl: "Pierwsza linia\nDruga <linia>");

        Assert.Contains("Pierwsza linia<br />Druga", message.HtmlBody);
        // The break survives encoding; the author's angle brackets do not.
        Assert.Contains("&lt;linia&gt;", message.HtmlBody);
    }

    [Fact]
    public void Uses_the_organisers_subject_verbatim()
    {
        // A branding subject template must not hijack a message the organiser titled themselves.
        var brand = new EmailBrand(Subject: "Zaproszenie na {event}", EventName: "Kermi Grand Opening");
        Assert.Equal("Autokar podstawiony", Build(Guest(), brand: brand).Subject);
    }

    [Fact]
    public void English_guest_gets_the_english_version_when_there_is_one()
    {
        var message = Build(Guest("en"), subjectEn: "Coach is ready", bodyEn: "The coach is waiting.");

        Assert.Equal("Coach is ready", message.Subject);
        Assert.Contains("The coach is waiting.", message.HtmlBody);
        Assert.Contains("Hello Anna", message.HtmlBody);
    }

    [Fact]
    public void English_guest_falls_back_to_polish_when_it_was_left_empty()
    {
        // An urgent message is often written in one language only; nobody should get a blank mail.
        var message = Build(Guest("en"));

        Assert.Equal("Autokar podstawiony", message.Subject);
        Assert.Contains("Autokar czeka przed wejściem.", message.HtmlBody);
    }

    [Fact]
    public void Links_the_guest_to_their_own_page_and_keeps_the_branding()
    {
        var brand = new EmailBrand(AccentColor: "#adce28", EventName: "Kermi Grand Opening", FromName: "Kermi");
        var message = Build(Guest(), brand: brand);

        Assert.Contains("https://eventpulse.pl/p/x", message.HtmlBody);
        Assert.Contains("#adce28", message.HtmlBody);
        Assert.Equal("Kermi", message.FromName);
        // Plain-text alternative carries the message as typed.
        Assert.Equal("Autokar czeka przed wejściem.", message.TextBody);
    }
}
