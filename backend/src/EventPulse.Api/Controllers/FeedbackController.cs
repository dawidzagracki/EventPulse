using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Participants.Application.Feedback;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/events/{eventId:guid}/feedback")]
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class FeedbackController : ControllerBase
{
    private readonly IMediator _mediator;

    public FeedbackController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<FeedbackSummaryDto>> Get(Guid eventId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new EventFeedbackQuery(eventId), ct));
    }
}
