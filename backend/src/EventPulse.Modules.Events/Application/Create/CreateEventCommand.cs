using MediatR;

namespace EventPulse.Modules.Events.Application.Create;

public sealed record CreateEventCommand(
    string Name,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string? Location,
    string? Description,
    string? DefaultLanguage,
    string? ClientEmail) : IRequest<EventDto>;
