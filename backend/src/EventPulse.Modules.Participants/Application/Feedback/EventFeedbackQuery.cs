using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Feedback;

public sealed record FeedbackItem(int Rating, string? Comment, DateTimeOffset SubmittedAt);

public sealed record FeedbackSummaryDto(int Count, double Average, IReadOnlyList<FeedbackItem> Items);

public sealed record EventFeedbackQuery(Guid EventId) : IRequest<FeedbackSummaryDto>;

public sealed class EventFeedbackHandler(IAppDbContext db) : IRequestHandler<EventFeedbackQuery, FeedbackSummaryDto>
{
    public async Task<FeedbackSummaryDto> Handle(EventFeedbackQuery request, CancellationToken cancellationToken)
    {
        var rows = await db.Set<Domain.Feedback>().AsNoTracking()
            .Where(f => f.EventId == request.EventId)
            .OrderByDescending(f => f.SubmittedAt)
            .Select(f => new FeedbackItem(f.Rating, f.Comment, f.SubmittedAt))
            .ToListAsync(cancellationToken);

        var average = rows.Count == 0 ? 0 : Math.Round(rows.Average(r => r.Rating), 2);
        return new FeedbackSummaryDto(rows.Count, average, rows);
    }
}
