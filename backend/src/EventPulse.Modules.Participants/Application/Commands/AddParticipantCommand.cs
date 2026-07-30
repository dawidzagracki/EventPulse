using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Commands;

public sealed record AddParticipantCommand(
    Guid EventId,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? Company,
    string? Position,
    string? Language,
    /// <summary>
    /// Entry-only guest: skipped by the bulk invitation send, because they are not meant to be
    /// pushed at the app. It is only a marker — adding a guest never sends anything.
    /// </summary>
    bool EntryOnly = false) : IRequest<ParticipantDto>;

public sealed class AddParticipantValidator : AbstractValidator<AddParticipantCommand>
{
    public AddParticipantValidator()
    {
        RuleFor(x => x.EventId).NotEmpty();
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Language).Must(l => l is null or "pl" or "en");
    }
}

/// <summary>
/// Creates the guest and nothing more. Adding somebody deliberately sends no mail at all: mails go
/// out only from an explicit "Wyślij zaproszenie" / "Wyślij kod QR" action, so that building the
/// guest list never sprays messages at people while it is still being assembled.
/// </summary>
public sealed class AddParticipantHandler : IRequestHandler<AddParticipantCommand, ParticipantDto>
{
    private readonly IAppDbContext _db;

    public AddParticipantHandler(IAppDbContext db) => _db = db;

    public async Task<ParticipantDto> Handle(AddParticipantCommand request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var exists = await _db.Set<Participant>()
            .AnyAsync(p => p.EventId == request.EventId && p.Email == email, cancellationToken);
        if (exists)
        {
            throw new ConflictException("A participant with this email already exists for this event.");
        }

        var participant = new Participant
        {
            EventId = request.EventId,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            Phone = request.Phone?.Trim(),
            Company = request.Company?.Trim(),
            Position = request.Position?.Trim(),
            Language = request.Language ?? "pl",
            EntryOnly = request.EntryOnly,
            Status = ParticipantStatus.Invited,
        };

        _db.Set<Participant>().Add(participant);
        await _db.SaveChangesAsync(cancellationToken);

        return ParticipantDto.From(participant);
    }
}
