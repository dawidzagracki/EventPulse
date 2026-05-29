using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Scanning.Application;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/events/{eventId:guid}/dashboard")]
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class DashboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public DashboardController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get(Guid eventId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new DashboardQuery(eventId), ct));
    }
}
