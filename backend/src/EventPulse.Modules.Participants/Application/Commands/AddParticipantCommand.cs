using EventPulse.Modules.Participants.Application.Invitations;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Notifications;
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
    // Entry-only guest: gets the QR code by mail instead of being invited into the app.
    bool EntryOnly = false,
    bool SendQrEmail = false,
    // Event context needed to build the QR e-mail (passed in so this module stays independent of Events).
    string? EventName = null,
    DateTimeOffset? EventStartsAt = null,
    string? Location = null,
    string? LinkBaseUrl = null,
    EmailBrand? Brand = null) : IRequest<AddParticipantResult>;

/// <summary>
/// The created guest plus whether the QR e-mail actually went out. Sending is best-effort: a
/// failing mail provider must never lose the guest, so the caller is told separately.
/// </summary>
public sealed record AddParticipantResult(ParticipantDto Participant, bool QrEmailSent);

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

public sealed class AddParticipantHandler : IRequestHandler<AddParticipantCommand, AddParticipantResult>
{
    private readonly IAppDbContext _db;
    private readonly IEmailSender _email;

    public AddParticipantHandler(IAppDbContext db, IEmailSender email)
    {
        _db = db;
        _email = email;
    }

    public async Task<AddParticipantResult> Handle(AddParticipantCommand request, CancellationToken cancellationToken)
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

        var qrEmailSent = false;
        if (request.SendQrEmail && request.EventName is not null && request.EventStartsAt is not null
            && request.LinkBaseUrl is not null)
        {
            var message = EntryQrEmail.Build(
                participant,
                request.EventName,
                request.EventStartsAt.Value,
                request.Location,
                SendEntryQrHandler.BuildLink(request.LinkBaseUrl, participant.AccessToken),
                request.Brand);

            try
            {
                await _email.SendAsync(message, cancellationToken);
                qrEmailSent = true;
            }
            catch
            {
                // Best-effort, like SendInvitationsCommand: the guest is already saved, and the
                // organiser can resend from the participant detail panel.
            }
        }

        return new AddParticipantResult(ParticipantDto.From(participant), qrEmailSent);
    }
}
