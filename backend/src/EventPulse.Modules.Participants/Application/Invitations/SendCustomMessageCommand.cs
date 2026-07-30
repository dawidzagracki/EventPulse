using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Invitations;

/// <summary>
/// Mails guests a message the organiser wrote — the "coach is waiting" case.
/// </summary>
/// <param name="ParticipantIds">
/// Exactly who to write to. The browser sends these because "who is on the list right now" is the
/// state of a filtered view (the search runs client-side over names, e-mails and companies), so the
/// server cannot reconstruct it. It does NOT trust the list: every id is re-checked against this
/// event, and guests who must not be written to are dropped regardless of what was sent.
/// </param>
public sealed record SendCustomMessageCommand(
    Guid EventId,
    IReadOnlyList<Guid> ParticipantIds,
    string SubjectPl,
    string BodyPl,
    string? SubjectEn,
    string? BodyEn,
    string LinkBaseUrl,
    EmailBrand? Brand = null) : IRequest<SendCustomMessageResult>;

/// <summary>Skipped = asked for but not written to (companion, no address, declined, wrong event).</summary>
public sealed record SendCustomMessageResult(int SentCount, int FailedCount, int SkippedCount);

public sealed class SendCustomMessageValidator : AbstractValidator<SendCustomMessageCommand>
{
    public SendCustomMessageValidator()
    {
        RuleFor(x => x.EventId).NotEmpty();
        RuleFor(x => x.SubjectPl).NotEmpty().MaximumLength(200);
        RuleFor(x => x.BodyPl).NotEmpty().MaximumLength(5000);
        RuleFor(x => x.SubjectEn).MaximumLength(200);
        RuleFor(x => x.BodyEn).MaximumLength(5000);
        // A cap bounds the blast radius of one click; no real guest list comes near it.
        RuleFor(x => x.ParticipantIds).NotEmpty().Must(ids => ids.Count <= 2000)
            .WithMessage("Too many recipients in a single message.");
    }
}

public sealed class SendCustomMessageHandler : IRequestHandler<SendCustomMessageCommand, SendCustomMessageResult>
{
    private readonly IAppDbContext _db;
    private readonly IEmailSender _email;

    public SendCustomMessageHandler(IAppDbContext db, IEmailSender email)
    {
        _db = db;
        _email = email;
    }

    public async Task<SendCustomMessageResult> Handle(SendCustomMessageCommand request, CancellationToken cancellationToken)
    {
        var ids = request.ParticipantIds;

        // Same guard rails as every other send: accompanying persons have no address of their own,
        // and somebody who declined is not coming. Entry-only guests DO get these — a coach change
        // matters to them too. Anything asked for but not eligible is reported as skipped.
        var recipients = await _db.Set<Participant>()
            .Where(p => p.EventId == request.EventId
                && ids.Contains(p.Id)
                && p.ParentParticipantId == null
                && p.Email != null
                && p.Status != ParticipantStatus.Declined)
            .ToListAsync(cancellationToken);

        var skipped = ids.Distinct().Count() - recipients.Count;

        var mails = recipients
            .Select(p => CustomMessageEmail.Build(
                p,
                request.SubjectPl,
                request.BodyPl,
                request.SubjectEn,
                request.BodyEn,
                $"{request.LinkBaseUrl.TrimEnd('/')}/{p.AccessToken}",
                request.Brand))
            .ToList();

        var result = await _email.SendManyAsync(mails, cancellationToken);
        return new SendCustomMessageResult(result.Sent, result.Failed, skipped);
    }
}
