using EventPulse.Modules.Events.Domain;

namespace EventPulse.Modules.Events.Application;

public sealed record EventDto(
    Guid Id,
    string Name,
    string Slug,
    EventStatus Status,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string? Location,
    string? Description,
    string DefaultLanguage,
    string? ClientEmail,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt)
{
    public static EventDto From(Event e) => new(
        e.Id, e.Name, e.Slug, e.Status, e.StartsAt, e.EndsAt,
        e.Location, e.Description, e.DefaultLanguage, e.ClientEmail, e.CreatedAt, e.UpdatedAt);
}
