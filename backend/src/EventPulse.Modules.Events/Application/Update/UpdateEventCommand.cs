using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Update;

public sealed record UpdateEventCommand(
    Guid Id,
    string Name,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string? Location,
    string? Description,
    string? DefaultLanguage,
    string? ClientEmail) : IRequest<EventDto>;

public sealed class UpdateEventValidator : AbstractValidator<UpdateEventCommand>
{
    public UpdateEventValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.EndsAt).GreaterThan(x => x.StartsAt);
        RuleFor(x => x.Location).MaximumLength(300);
        RuleFor(x => x.DefaultLanguage).Must(l => l is null or "pl" or "en");
        RuleFor(x => x.ClientEmail).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.ClientEmail));
    }
}

public sealed class UpdateEventHandler : IRequestHandler<UpdateEventCommand, EventDto>
{
    private readonly IAppDbContext _db;

    public UpdateEventHandler(IAppDbContext db) => _db = db;

    public async Task<EventDto> Handle(UpdateEventCommand request, CancellationToken cancellationToken)
    {
        var ev = await _db.Set<Event>()
            .FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        ev.Name = request.Name.Trim();
        ev.StartsAt = request.StartsAt;
        ev.EndsAt = request.EndsAt;
        ev.Location = request.Location?.Trim();
        ev.Description = request.Description;
        ev.DefaultLanguage = request.DefaultLanguage ?? ev.DefaultLanguage;
        ev.ClientEmail = request.ClientEmail?.Trim().ToLowerInvariant();

        await _db.SaveChangesAsync(cancellationToken);
        return EventDto.From(ev);
    }
}
