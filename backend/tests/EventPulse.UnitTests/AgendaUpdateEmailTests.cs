using EventPulse.Modules.Agenda.Application;
using EventPulse.Modules.Agenda.Domain;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;

namespace EventPulse.UnitTests;

public class AgendaUpdateEmailTests
{
    // 12:30 UTC on the Kermi day = 14:30 in Europe/Warsaw. The mail must show the local hour.
    private static readonly DateTimeOffset FirstStart = new(2026, 7, 30, 12, 30, 0, TimeSpan.Zero);

    private static List<AgendaItem> Items() =>
    [
        new() { EventId = Guid.NewGuid(), StartsAt = FirstStart, EndsAt = FirstStart.AddHours(1), TitlePl = "Część oficjalna", TitleEn = "Official part" },
        new() { EventId = Guid.NewGuid(), StartsAt = FirstStart.AddHours(3), EndsAt = FirstStart.AddHours(4), TitlePl = "Uroczysta kolacja", TitleEn = "Gala dinner" },
    ];

    private static Participant Guest(string language = "pl") => new()
    {
        FirstName = "Anna",
        LastName = "Kowalska",
        Email = "anna@example.com",
        Language = language,
    };

    private static EmailMessage Build(Participant guest, EmailBrand? brand = null) =>
        AgendaUpdateEmail.Build(guest, "Kermi Grand Opening", Items(), $"https://eventpulse.pl/p/{guest.AccessToken}", brand);

    [Fact]
    public void Lists_the_current_agenda_in_event_local_time()
    {
        var message = Build(Guest());

        Assert.Contains("Część oficjalna", message.HtmlBody);
        Assert.Contains("Uroczysta kolacja", message.HtmlBody);
        // 14:30 local, not the 12:30 stored in Postgres.
        Assert.Contains("14:30", message.HtmlBody);
        Assert.DoesNotContain(">12:30<", message.HtmlBody);
        // Plain-text alternative carries the same plan.
        Assert.Contains("Uroczysta kolacja", message.TextBody!);
    }

    [Fact]
    public void Links_the_guest_to_their_own_page()
    {
        var guest = Guest();
        var message = Build(guest);

        // The old automatic mail told guests to open their event page but included no link at all.
        Assert.Contains($"https://eventpulse.pl/p/{guest.AccessToken}", message.HtmlBody);
    }

    [Fact]
    public void Uses_english_for_an_english_guest()
    {
        var message = Build(Guest("en"));

        Assert.Contains("Official part", message.HtmlBody);
        Assert.Contains("Gala dinner", message.HtmlBody);
        Assert.DoesNotContain("Uroczysta kolacja", message.HtmlBody);
        Assert.Contains("Agenda update", message.Subject);
    }

    [Fact]
    public void Applies_the_event_branding()
    {
        var brand = new EmailBrand(AccentColor: "#adce28", EventName: "Kermi Grand Opening", FromName: "Kermi");
        var message = Build(Guest(), brand);

        Assert.Equal("Kermi", message.FromName);
        Assert.Contains("#adce28", message.HtmlBody);
    }

    [Fact]
    public void Honours_a_custom_subject_from_the_brand()
    {
        var brand = new EmailBrand(Subject: "Nowości: {event}", EventName: "Kermi Grand Opening");
        Assert.Equal("Nowości: Kermi Grand Opening", Build(Guest(), brand).Subject);
    }
}
