using System.Text.Json;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Domain;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Engagement;

public sealed class Quiz : TenantEntity
{
    public Guid EventId { get; set; }
    public required string Title { get; set; }
}

public sealed class QuizQuestion : TenantEntity
{
    public Guid QuizId { get; set; }
    public int Order { get; set; }
    public required string Text { get; set; }

    /// <summary>JSON array of option strings.</summary>
    public required string OptionsJson { get; set; }
    public int CorrectIndex { get; set; }
}

public sealed class QuizResult : TenantEntity
{
    public Guid QuizId { get; set; }
    public Guid ParticipantId { get; set; }
    public int Score { get; set; }
    public int Total { get; set; }
    public DateTimeOffset SubmittedAt { get; set; }
}

public sealed record QuizDto(Guid Id, Guid EventId, string Title)
{
    public static QuizDto From(Quiz q) => new(q.Id, q.EventId, q.Title);
}

public sealed record QuizQuestionDto(Guid Id, string Text, IReadOnlyList<string> Options);

public sealed record QuizTakeDto(Guid QuizId, string Title, IReadOnlyList<QuizQuestionDto> Questions);

public sealed record ListQuizzesQuery(Guid EventId) : IRequest<IReadOnlyList<QuizDto>>;

public sealed class ListQuizzesHandler(IAppDbContext db) : IRequestHandler<ListQuizzesQuery, IReadOnlyList<QuizDto>>
{
    public async Task<IReadOnlyList<QuizDto>> Handle(ListQuizzesQuery request, CancellationToken ct)
    {
        var rows = await db.Set<Quiz>().AsNoTracking().Where(q => q.EventId == request.EventId).ToListAsync(ct);
        return rows.Select(QuizDto.From).ToList();
    }
}

public sealed record CreateQuizCommand(Guid EventId, string Title) : IRequest<QuizDto>;

public sealed class CreateQuizValidator : AbstractValidator<CreateQuizCommand>
{
    public CreateQuizValidator() => RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
}

public sealed class CreateQuizHandler(IAppDbContext db) : IRequestHandler<CreateQuizCommand, QuizDto>
{
    public async Task<QuizDto> Handle(CreateQuizCommand request, CancellationToken ct)
    {
        var quiz = new Quiz { EventId = request.EventId, Title = request.Title.Trim() };
        db.Set<Quiz>().Add(quiz);
        await db.SaveChangesAsync(ct);
        return QuizDto.From(quiz);
    }
}

public sealed record AddQuizQuestionCommand(Guid QuizId, string Text, IReadOnlyList<string> Options, int CorrectIndex)
    : IRequest;

public sealed class AddQuizQuestionValidator : AbstractValidator<AddQuizQuestionCommand>
{
    public AddQuizQuestionValidator()
    {
        RuleFor(x => x.Text).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Options).Must(o => o.Count is >= 2 and <= 6).WithMessage("2–6 options required.");
        RuleFor(x => x).Must(x => x.CorrectIndex >= 0 && x.CorrectIndex < x.Options.Count)
            .WithMessage("CorrectIndex out of range.");
    }
}

public sealed class AddQuizQuestionHandler(IAppDbContext db) : IRequestHandler<AddQuizQuestionCommand>
{
    public async Task Handle(AddQuizQuestionCommand request, CancellationToken ct)
    {
        var order = await db.Set<QuizQuestion>().CountAsync(q => q.QuizId == request.QuizId, ct);
        db.Set<QuizQuestion>().Add(new QuizQuestion
        {
            QuizId = request.QuizId,
            Order = order,
            Text = request.Text.Trim(),
            OptionsJson = JsonSerializer.Serialize(request.Options),
            CorrectIndex = request.CorrectIndex,
        });
        await db.SaveChangesAsync(ct);
    }
}

public sealed record GetQuizTakeQuery(Guid QuizId) : IRequest<QuizTakeDto>;

public sealed class GetQuizTakeHandler(IAppDbContext db) : IRequestHandler<GetQuizTakeQuery, QuizTakeDto>
{
    public async Task<QuizTakeDto> Handle(GetQuizTakeQuery request, CancellationToken ct)
    {
        var quiz = await db.Set<Quiz>().AsNoTracking().FirstOrDefaultAsync(q => q.Id == request.QuizId, ct)
            ?? throw new NotFoundException("Quiz not found.");

        var questions = await db.Set<QuizQuestion>().AsNoTracking()
            .Where(q => q.QuizId == request.QuizId).OrderBy(q => q.Order).ToListAsync(ct);

        // Correct answers are never sent to the participant.
        var dtos = questions
            .Select(q => new QuizQuestionDto(q.Id, q.Text, JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? []))
            .ToList();

        return new QuizTakeDto(quiz.Id, quiz.Title, dtos);
    }
}

public sealed record SubmitQuizCommand(Guid QuizId, Guid ParticipantId, IReadOnlyDictionary<Guid, int> Answers)
    : IRequest<int>;

public sealed class SubmitQuizHandler(IAppDbContext db) : IRequestHandler<SubmitQuizCommand, int>
{
    public async Task<int> Handle(SubmitQuizCommand request, CancellationToken ct)
    {
        var questions = await db.Set<QuizQuestion>().AsNoTracking()
            .Where(q => q.QuizId == request.QuizId).ToListAsync(ct);

        var score = questions.Count(q => request.Answers.TryGetValue(q.Id, out var chosen) && chosen == q.CorrectIndex);

        var existing = await db.Set<QuizResult>()
            .FirstOrDefaultAsync(r => r.QuizId == request.QuizId && r.ParticipantId == request.ParticipantId, ct);

        if (existing is null)
        {
            db.Set<QuizResult>().Add(new QuizResult
            {
                QuizId = request.QuizId,
                ParticipantId = request.ParticipantId,
                Score = score,
                Total = questions.Count,
                SubmittedAt = DateTimeOffset.UtcNow,
            });
        }
        else
        {
            existing.Score = score;
            existing.Total = questions.Count;
            existing.SubmittedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return score;
    }
}

public sealed record QuizRankingQuery(Guid QuizId) : IRequest<IReadOnlyList<RankingEntry>>;

public sealed class QuizRankingHandler(IAppDbContext db) : IRequestHandler<QuizRankingQuery, IReadOnlyList<RankingEntry>>
{
    public async Task<IReadOnlyList<RankingEntry>> Handle(QuizRankingQuery request, CancellationToken ct)
    {
        var results = await db.Set<QuizResult>().AsNoTracking()
            .Where(r => r.QuizId == request.QuizId)
            .Join(db.Set<Participant>().AsNoTracking(), r => r.ParticipantId, p => p.Id,
                (r, p) => new { Name = p.FirstName + " " + p.LastName, r.Score })
            .OrderByDescending(r => r.Score)
            .ToListAsync(ct);

        return results.Select((r, i) => new RankingEntry(i + 1, r.Name, r.Score)).ToList();
    }
}
