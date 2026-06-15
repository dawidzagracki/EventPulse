using System.Security.Claims;
using EventPulse.Modules.Agenda.Application;
using EventPulse.Modules.Ai;
using EventPulse.Modules.Engagement;
using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Gallery;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Logistics;
using EventPulse.Modules.Participants.Application.Feedback;
using EventPulse.Modules.Participants.Application.Me;
using EventPulse.Modules.Participants.Application.Qr;
using EventPulse.Modules.Scanning.Application;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

/// <summary>Self-service endpoints for the logged-in participant (acts only on their own record).</summary>
[ApiController]
[Route("api/me")]
[Authorize(Policy = AuthPolicies.Participant)]
public sealed class ParticipantMeController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IConfiguration _configuration;

    public ParticipantMeController(IMediator mediator, IConfiguration configuration)
    {
        _mediator = mediator;
        _configuration = configuration;
    }

    private Guid ParticipantId => Guid.Parse(User.FindFirstValue("sub")!);
    private Guid EventId => Guid.Parse(User.FindFirstValue(AppClaims.EventId)!);

    private string ParticipantLinkBaseUrl =>
        _configuration["App:ParticipantLinkBaseUrl"] ?? "http://localhost:5173/p";

    [HttpGet]
    public async Task<ActionResult<MyProfileDto>> Profile(CancellationToken ct)
        => Ok(await _mediator.Send(new GetMyProfileQuery(ParticipantId), ct));

    /// <summary>Mini event summary for the in-app participant home (name, when, where, status).</summary>
    [HttpGet("event")]
    public async Task<ActionResult<EventSummaryDto>> MyEvent(CancellationToken ct)
        => Ok(await _mediator.Send(new GetEventSummaryQuery(EventId), ct));

    /// <summary>The logged-in participant's own check-in QR (PNG), to show at the gate.</summary>
    [HttpGet("qr")]
    public async Task<IActionResult> MyQr(CancellationToken ct)
    {
        var png = await _mediator.Send(new GetParticipantQrQuery(ParticipantId, ParticipantLinkBaseUrl), ct);
        return File(png, "image/png");
    }

    [HttpPost("consents")]
    public async Task<ActionResult<MyProfileDto>> Consents(ConsentsBody body, CancellationToken ct)
        => Ok(await _mediator.Send(
            new AcceptConsentsCommand(ParticipantId, body.RodoAccepted, body.PhotoConsent, body.NetworkingConsent), ct));

    /// <summary>RSVP — confirm attendance or decline (spec §3.2).</summary>
    [HttpPost("rsvp")]
    public async Task<ActionResult<MyProfileDto>> Rsvp(RsvpBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new RsvpCommand(ParticipantId, body.Attending), ct));

    /// <summary>Guest self-records presence at a station they scanned (spec §3.2).</summary>
    [HttpPost("scans")]
    public async Task<ActionResult<SelfStationScanResult>> ScanStation(SelfScanBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new SelfStationScanCommand(
            EventId, ParticipantId, body.StationCode,
            body.ClientId ?? Guid.NewGuid(), body.OccurredAt ?? DateTimeOffset.UtcNow), ct));

    [HttpPut("preferences")]
    public async Task<ActionResult<MyProfileDto>> Preferences(PreferencesBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateMyPreferencesCommand(
            ParticipantId, body.Language, body.DietaryPreferences, body.ShirtSize, body.Wishes,
            body.AirportTransfer, body.ArrivalTime, body.FlightNumber), ct));

    [HttpGet("agenda")]
    public async Task<ActionResult<IReadOnlyList<AgendaItemDto>>> Agenda(CancellationToken ct)
    {
        var me = await _mediator.Send(new GetMyProfileQuery(ParticipantId), ct);
        return Ok(await _mediator.Send(new ParticipantAgendaQuery(me.EventId, me.GroupName), ct));
    }

    [HttpGet("transfers")]
    public async Task<ActionResult<IReadOnlyList<TransferDto>>> Transfers(CancellationToken ct)
        => Ok(await _mediator.Send(new ListTransfersQuery(EventId), ct));

    [HttpPost("feedback")]
    public async Task<IActionResult> Feedback(FeedbackBody body, CancellationToken ct)
    {
        await _mediator.Send(new SubmitFeedbackCommand(ParticipantId, EventId, body.Rating, body.Comment), ct);
        return NoContent();
    }

    [HttpGet("quizzes")]
    public async Task<ActionResult<IReadOnlyList<QuizDto>>> Quizzes(CancellationToken ct)
        => Ok(await _mediator.Send(new ListQuizzesQuery(EventId), ct));

    [HttpGet("quizzes/{quizId:guid}")]
    public async Task<ActionResult<QuizTakeDto>> Quiz(Guid quizId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetQuizTakeQuery(quizId), ct));

    [HttpPost("quizzes/{quizId:guid}/submit")]
    public async Task<ActionResult<object>> SubmitQuiz(Guid quizId, Dictionary<Guid, int> answers, CancellationToken ct)
    {
        var score = await _mediator.Send(new SubmitQuizCommand(quizId, ParticipantId, answers), ct);
        return Ok(new { score });
    }

    [HttpGet("networking")]
    public async Task<ActionResult<IReadOnlyList<ContactDto>>> Contacts(CancellationToken ct)
        => Ok(await _mediator.Send(new ListMyContactsQuery(ParticipantId), ct));

    [HttpPost("networking")]
    public async Task<ActionResult<ContactDto>> AddContact(AddContactBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new AddNetworkingContactCommand(ParticipantId, body.TargetToken), ct));

    public sealed record AddContactBody(Guid TargetToken);

    [HttpPost("ai/chat")]
    public async Task<ActionResult<object>> AiChat(AiChatBody body, CancellationToken ct)
    {
        var reply = await _mediator.Send(new ChatCommand(ParticipantId, EventId, body.Message), ct);
        return Ok(new { reply });
    }

    public sealed record AiChatBody(string Message);

    [HttpGet("gallery")]
    public async Task<ActionResult<IReadOnlyList<PhotoDto>>> Gallery(CancellationToken ct)
        => Ok(await _mediator.Send(new ListPhotosQuery(EventId, OnlyPublished: true), ct));

    [HttpGet("gallery/{id:guid}/file")]
    public async Task<IActionResult> GalleryFile(Guid id, CancellationToken ct)
    {
        var stored = await _mediator.Send(new GetPhotoFileQuery(id, RequirePublished: true), ct);
        return File(stored.Content, stored.ContentType);
    }

    public sealed record FeedbackBody(int Rating, string? Comment);

    public sealed record ConsentsBody(bool RodoAccepted, bool PhotoConsent, bool NetworkingConsent);

    public sealed record RsvpBody(bool Attending);

    public sealed record SelfScanBody(string StationCode, Guid? ClientId, DateTimeOffset? OccurredAt);

    public sealed record PreferencesBody(
        string? Language,
        string? DietaryPreferences,
        string? ShirtSize,
        string? Wishes,
        bool AirportTransfer,
        string? ArrivalTime,
        string? FlightNumber);
}
