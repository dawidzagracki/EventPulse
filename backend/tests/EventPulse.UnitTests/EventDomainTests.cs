using EventPulse.Modules.Events.Application;
using EventPulse.Modules.Events.Domain;

namespace EventPulse.UnitTests;

public class SlugTests
{
    [Theory]
    [InlineData("Gala Firmowa 2026", "gala-firmowa-2026")]
    [InlineData("Konferencja IT", "konferencja-it")]
    [InlineData("Święto Wiosny — Łąka", "swieto-wiosny-laka")]
    [InlineData("  wielo   spacje  ", "wielo-spacje")]
    [InlineData("???", "event")]
    public void Generates_url_safe_slug(string input, string expected)
        => Assert.Equal(expected, Slug.From(input));
}

public class EventStatusTransitionTests
{
    [Theory]
    [InlineData(EventStatus.Draft, EventStatus.Published, true)]
    [InlineData(EventStatus.Published, EventStatus.Live, true)]
    [InlineData(EventStatus.Live, EventStatus.Completed, true)]
    [InlineData(EventStatus.Completed, EventStatus.Archived, true)]
    [InlineData(EventStatus.Draft, EventStatus.Live, false)]
    [InlineData(EventStatus.Published, EventStatus.Archived, false)]
    [InlineData(EventStatus.Archived, EventStatus.Draft, false)]
    public void Enforces_allowed_transitions(EventStatus from, EventStatus to, bool allowed)
        => Assert.Equal(allowed, EventStatusTransitions.IsAllowed(from, to));
}
