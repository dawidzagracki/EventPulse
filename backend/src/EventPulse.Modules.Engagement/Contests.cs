using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Domain;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Engagement;

public enum ScoringMode
{
    Points = 0, // higher is better
    Time = 1,   // lower (seconds) is better
}

public sealed class Contest : TenantEntity
{
    public Guid EventId { get; set; }
    public required string Name { get; set; }
    public ScoringMode Mode { get; set; }
}

public sealed class ContestResult : TenantEntity
{
    public Guid ContestId { get; set; }
    public Guid ParticipantId { get; set; }
    public double Score { get; set; }
    public DateTimeOffset RecordedAt { get; set; }
}

public sealed record ContestDto(Guid Id, Guid EventId, string Name, ScoringMode Mode)
{
    public static ContestDto From(Contest c) => new(c.Id, c.EventId, c.Name, c.Mode);
}

public sealed record RankingEntry(int Rank, string Name, double Score);

public sealed record ListContestsQuery(Guid EventId) : IRequest<IReadOnlyList<ContestDto>>;

public sealed class ListContestsHandler(IAppDbContext db) : IRequestHandler<ListContestsQuery, IReadOnlyList<ContestDto>>
{
    public async Task<IReadOnlyList<ContestDto>> Handle(ListContestsQuery request, CancellationToken ct)
    {
        var rows = await db.Set<Contest>().AsNoTracking()
            .Where(c => c.EventId == request.EventId).ToListAsync(ct);
        return rows.Select(ContestDto.From).ToList();
    }
}

public sealed record CreateContestCommand(Guid EventId, string Name, ScoringMode Mode) : IRequest<ContestDto>;

public sealed class CreateContestValidator : AbstractValidator<CreateContestCommand>
{
    public CreateContestValidator() => RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
}

public sealed class CreateContestHandler(IAppDbContext db) : IRequestHandler<CreateContestCommand, ContestDto>
{
    public async Task<ContestDto> Handle(CreateContestCommand request, CancellationToken ct)
    {
        var contest = new Contest { EventId = request.EventId, Name = request.Name.Trim(), Mode = request.Mode };
        db.Set<Contest>().Add(contest);
        await db.SaveChangesAsync(ct);
        return ContestDto.From(contest);
    }
}

public sealed record SubmitContestResultCommand(Guid ContestId, Guid ParticipantId, double Score) : IRequest;

public sealed class SubmitContestResultHandler(IAppDbContext db) : IRequestHandler<SubmitContestResultCommand>
{
    public async Task Handle(SubmitContestResultCommand request, CancellationToken ct)
    {
        var existing = await db.Set<ContestResult>()
            .FirstOrDefaultAsync(r => r.ContestId == request.ContestId && r.ParticipantId == request.ParticipantId, ct);

        if (existing is null)
        {
            db.Set<ContestResult>().Add(new ContestResult
            {
                ContestId = request.ContestId,
                ParticipantId = request.ParticipantId,
                Score = request.Score,
                RecordedAt = DateTimeOffset.UtcNow,
            });
        }
        else
        {
            existing.Score = request.Score;
            existing.RecordedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(ct);
    }
}

public sealed record ContestRankingQuery(Guid ContestId) : IRequest<IReadOnlyList<RankingEntry>>;

public sealed class ContestRankingHandler(IAppDbContext db) : IRequestHandler<ContestRankingQuery, IReadOnlyList<RankingEntry>>
{
    public async Task<IReadOnlyList<RankingEntry>> Handle(ContestRankingQuery request, CancellationToken ct)
    {
        var contest = await db.Set<Contest>().AsNoTracking().FirstOrDefaultAsync(c => c.Id == request.ContestId, ct)
            ?? throw new NotFoundException("Contest not found.");

        var results = await db.Set<ContestResult>().AsNoTracking()
            .Where(r => r.ContestId == request.ContestId)
            .Join(db.Set<Participant>().AsNoTracking(), r => r.ParticipantId, p => p.Id,
                (r, p) => new { Name = p.FirstName + " " + p.LastName, r.Score })
            .ToListAsync(ct);

        var ordered = contest.Mode == ScoringMode.Points
            ? results.OrderByDescending(r => r.Score)
            : results.OrderBy(r => r.Score);

        return ordered.Select((r, i) => new RankingEntry(i + 1, r.Name, r.Score)).ToList();
    }
}
