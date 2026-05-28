using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Me;

public sealed record UpdateMyPreferencesCommand(
    Guid ParticipantId,
    string? Language,
    string? DietaryPreferences,
    string? ShirtSize,
    string? Wishes,
    bool AirportTransfer,
    string? ArrivalTime,
    string? FlightNumber) : IRequest<MyProfileDto>;

public sealed class UpdateMyPreferencesValidator : AbstractValidator<UpdateMyPreferencesCommand>
{
    public UpdateMyPreferencesValidator()
    {
        RuleFor(x => x.Language).Must(l => l is null or "pl" or "en");
        RuleFor(x => x.DietaryPreferences).MaximumLength(1000);
        RuleFor(x => x.ShirtSize).MaximumLength(20);
        RuleFor(x => x.Wishes).MaximumLength(2000);
    }
}

public sealed class UpdateMyPreferencesHandler : IRequestHandler<UpdateMyPreferencesCommand, MyProfileDto>
{
    private readonly IAppDbContext _db;

    public UpdateMyPreferencesHandler(IAppDbContext db) => _db = db;

    public async Task<MyProfileDto> Handle(UpdateMyPreferencesCommand request, CancellationToken cancellationToken)
    {
        var participant = await _db.Set<Participant>()
            .FirstOrDefaultAsync(p => p.Id == request.ParticipantId, cancellationToken)
            ?? throw new NotFoundException("Participant not found.");

        if (request.Language is not null)
        {
            participant.Language = request.Language;
        }

        participant.DietaryPreferences = request.DietaryPreferences;
        participant.ShirtSize = request.ShirtSize;
        participant.Wishes = request.Wishes;
        participant.AirportTransfer = request.AirportTransfer;
        participant.ArrivalTime = request.ArrivalTime;
        participant.FlightNumber = request.FlightNumber;
        participant.PreferencesSubmittedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return MyProfileDto.From(participant);
    }
}
