using EventPulse.Modules.Engagement;
using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

/// <summary>Agency/client management of contests and quizzes.</summary>
[ApiController]
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class EngagementController : ControllerBase
{
    private readonly IMediator _mediator;

    public EngagementController(IMediator mediator) => _mediator = mediator;

    // ---- Contests ----

    [HttpGet("api/events/{eventId:guid}/contests")]
    public async Task<ActionResult<IReadOnlyList<ContestDto>>> Contests(Guid eventId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new ListContestsQuery(eventId), ct));
    }

    [HttpPost("api/events/{eventId:guid}/contests")]
    public async Task<ActionResult<ContestDto>> CreateContest(Guid eventId, CreateContestBody body, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new CreateContestCommand(eventId, body.Name, body.Mode), ct));
    }

    [HttpPost("api/events/{eventId:guid}/contests/{contestId:guid}/results")]
    public async Task<IActionResult> SubmitResult(Guid eventId, Guid contestId, ContestResultBody body, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        await _mediator.Send(new SubmitContestResultCommand(contestId, body.ParticipantId, body.Score), ct);
        return NoContent();
    }

    [HttpGet("api/events/{eventId:guid}/contests/{contestId:guid}/ranking")]
    public async Task<ActionResult<IReadOnlyList<RankingEntry>>> ContestRanking(Guid eventId, Guid contestId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new ContestRankingQuery(contestId), ct));
    }

    // ---- Quizzes ----

    [HttpGet("api/events/{eventId:guid}/quizzes")]
    public async Task<ActionResult<IReadOnlyList<QuizDto>>> Quizzes(Guid eventId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new ListQuizzesQuery(eventId), ct));
    }

    [HttpPost("api/events/{eventId:guid}/quizzes")]
    public async Task<ActionResult<QuizDto>> CreateQuiz(Guid eventId, CreateQuizBody body, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new CreateQuizCommand(eventId, body.Title), ct));
    }

    [HttpPost("api/events/{eventId:guid}/quizzes/{quizId:guid}/questions")]
    public async Task<IActionResult> AddQuestion(Guid eventId, Guid quizId, QuestionBody body, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        await _mediator.Send(new AddQuizQuestionCommand(quizId, body.Text, body.Options, body.CorrectIndex), ct);
        return NoContent();
    }

    [HttpGet("api/events/{eventId:guid}/quizzes/{quizId:guid}/ranking")]
    public async Task<ActionResult<IReadOnlyList<RankingEntry>>> QuizRanking(Guid eventId, Guid quizId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new QuizRankingQuery(quizId), ct));
    }

    public sealed record CreateContestBody(string Name, ScoringMode Mode);

    public sealed record ContestResultBody(Guid ParticipantId, double Score);

    public sealed record CreateQuizBody(string Title);

    public sealed record QuestionBody(string Text, List<string> Options, int CorrectIndex);
}
