using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Feedback;

public sealed record SubmitFeedbackCommand(Guid ParticipantId, Guid EventId, int Rating, string? Comment) : IRequest;

public sealed class SubmitFeedbackValidator : AbstractValidator<SubmitFeedbackCommand>
{
    public SubmitFeedbackValidator()
    {
        RuleFor(x => x.Rating).InclusiveBetween(1, 5);
        RuleFor(x => x.Comment).MaximumLength(2000);
    }
}

public sealed class SubmitFeedbackHandler(IAppDbContext db) : IRequestHandler<SubmitFeedbackCommand>
{
    public async Task Handle(SubmitFeedbackCommand request, CancellationToken cancellationToken)
    {
        var existing = await db.Set<Domain.Feedback>()
            .FirstOrDefaultAsync(f => f.EventId == request.EventId && f.ParticipantId == request.ParticipantId, cancellationToken);

        if (existing is null)
        {
            db.Set<Domain.Feedback>().Add(new Domain.Feedback
            {
                EventId = request.EventId,
                ParticipantId = request.ParticipantId,
                Rating = request.Rating,
                Comment = request.Comment,
                SubmittedAt = DateTimeOffset.UtcNow,
            });
        }
        else
        {
            existing.Rating = request.Rating;
            existing.Comment = request.Comment;
            existing.SubmittedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
