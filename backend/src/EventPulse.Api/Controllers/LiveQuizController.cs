using System.Text.Json;
using EventPulse.Api.Hubs;
using EventPulse.Api.LiveQuiz;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Engagement;
using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Shared.Application;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Api.Controllers;

/// <summary>
/// Host controls for a live "Kahoot" quiz (spec §2.8). The host (Agency/Client)
/// starts the session and advances questions; participants receive everything in
/// real time over <see cref="QuizHub"/> and answer there.
/// </summary>
[ApiController]
[Route("api/events/{eventId:guid}/quizzes/{quizId:guid}/live")]
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class LiveQuizController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly AppDbContext _db;
    private readonly LiveQuizRegistry _registry;
    private readonly IHubContext<QuizHub> _hub;

    public LiveQuizController(IMediator mediator, AppDbContext db, LiveQuizRegistry registry, IHubContext<QuizHub> hub)
    {
        _mediator = mediator;
        _db = db;
        _registry = registry;
        _hub = hub;
    }

    /// <summary>Loads the quiz questions and opens the lobby; broadcasts "started".</summary>
    [HttpPost("start")]
    public async Task<IActionResult> Start(Guid eventId, Guid quizId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct); // ownership

        var quiz = await _db.Set<Quiz>().AsNoTracking().FirstOrDefaultAsync(q => q.Id == quizId && q.EventId == eventId, ct)
            ?? throw new NotFoundException("Quiz not found.");
        var questions = await _db.Set<QuizQuestion>().AsNoTracking()
            .Where(q => q.QuizId == quizId).OrderBy(q => q.Order).ToListAsync(ct);

        var live = questions
            .Select(q => new LiveQuestion(
                q.Id, q.Text,
                JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? [],
                q.CorrectIndex))
            .ToList();

        await _registry.StartAsync(quizId, quiz.Title, live, ct);
        await _hub.Clients.Group(QuizHub.Group(quizId))
            .SendAsync("started", new { title = quiz.Title, questionCount = live.Count }, ct);

        return Ok(new { questionCount = live.Count });
    }

    /// <summary>Advances to the next question (or finishes); broadcasts "question" or "finished".</summary>
    [HttpPost("next")]
    public async Task<IActionResult> Next(Guid eventId, Guid quizId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);

        var (session, _) = await _registry.MutateAsync(quizId, s =>
        {
            s.Next(DateTimeOffset.UtcNow);
            return 0;
        }, ct);

        if (session.Finished)
        {
            await PersistResultsAsync(eventId, quizId, session, ct);
            await _hub.Clients.Group(QuizHub.Group(quizId))
                .SendAsync("finished", new { leaderboard = session.Leaderboard() }, ct);
            await _registry.EndAsync(quizId, ct);
            return Ok(new { finished = true });
        }

        var q = session.Current!;
        await _hub.Clients.Group(QuizHub.Group(quizId)).SendAsync("question", new
        {
            index = session.CurrentIndex,
            questionCount = session.QuestionCount,
            text = q.Text,
            options = q.Options, // correct index intentionally withheld
        }, ct);

        return Ok(new { index = session.CurrentIndex });
    }

    /// <summary>Reveals the correct answer + current leaderboard for the question.</summary>
    [HttpPost("reveal")]
    public async Task<IActionResult> Reveal(Guid eventId, Guid quizId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);

        var (session, _) = await _registry.MutateAsync(quizId, s =>
        {
            s.Reveal();
            return 0;
        }, ct);

        await _hub.Clients.Group(QuizHub.Group(quizId)).SendAsync("reveal", new
        {
            correctIndex = session.Current?.CorrectIndex ?? -1,
            leaderboard = session.Leaderboard(),
        }, ct);

        return Ok();
    }

    /// <summary>Ends the session early; persists results and broadcasts "finished".</summary>
    [HttpPost("end")]
    public async Task<IActionResult> End(Guid eventId, Guid quizId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        var session = await _registry.GetAsync(quizId, ct);
        if (session is not null)
        {
            await PersistResultsAsync(eventId, quizId, session, ct);
            await _hub.Clients.Group(QuizHub.Group(quizId))
                .SendAsync("finished", new { leaderboard = session.Leaderboard() }, ct);
            await _registry.EndAsync(quizId, ct);
        }

        return Ok();
    }

    private async Task PersistResultsAsync(Guid eventId, Guid quizId, LiveQuizSession session, CancellationToken ct)
    {
        foreach (var (participantId, score) in session.Results())
        {
            var existing = await _db.Set<QuizResult>()
                .FirstOrDefaultAsync(r => r.QuizId == quizId && r.ParticipantId == participantId, ct);
            if (existing is null)
            {
                // TenantId is stamped automatically on insert by the save interceptor.
                _db.Set<QuizResult>().Add(new QuizResult
                {
                    QuizId = quizId,
                    ParticipantId = participantId,
                    Score = score,
                    Total = session.QuestionCount,
                    SubmittedAt = DateTimeOffset.UtcNow,
                });
            }
            else
            {
                existing.Score = score;
                existing.Total = session.QuestionCount;
                existing.SubmittedAt = DateTimeOffset.UtcNow;
            }
        }

        await _db.SaveChangesAsync(ct);
    }
}
