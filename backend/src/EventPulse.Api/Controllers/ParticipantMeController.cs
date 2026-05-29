using System.Security.Claims;
using EventPulse.Modules.Agenda.Application;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Logistics;
using EventPulse.Modules.Participants.Application.Feedback;
using EventPulse.Modules.Participants.Application.Me;
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

    public ParticipantMeController(IMediator mediator) => _mediator = mediator;

    private Guid ParticipantId => Guid.Parse(User.FindFirstValue("sub")!);
    private Guid EventId => Guid.Parse(User.FindFirstValue(AppClaims.EventId)!);

    [HttpGet]
    public async Task<ActionResult<MyProfileDto>> Profile(CancellationToken ct)
        => Ok(await _mediator.Send(new GetMyProfileQuery(ParticipantId), ct));

    [HttpPost("consents")]
    public async Task<ActionResult<MyProfileDto>> Consents(ConsentsBody body, CancellationToken ct)
        => Ok(await _mediator.Send(
            new AcceptConsentsCommand(ParticipantId, body.RodoAccepted, body.PhotoConsent, body.NetworkingConsent), ct));

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

    public sealed record FeedbackBody(int Rating, string? Comment);

    public sealed record ConsentsBody(bool RodoAccepted, bool PhotoConsent, bool NetworkingConsent);

    public sealed record PreferencesBody(
        string? Language,
        string? DietaryPreferences,
        string? ShirtSize,
        string? Wishes,
        bool AirportTransfer,
        string? ArrivalTime,
        string? FlightNumber);
}
