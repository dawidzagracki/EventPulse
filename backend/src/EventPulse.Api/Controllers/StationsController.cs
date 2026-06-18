using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Scanning.Application;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

/// <summary>Admin management of event stations + their activity rollup ("Stanowiska" tab).</summary>
[ApiController]
[Route("api/events/{eventId:guid}/stations")]
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class StationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public StationsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StationDto>>> List(Guid eventId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new ListStationsQuery(eventId), ct));
    }

    [HttpPut]
    public async Task<ActionResult<IReadOnlyList<StationDto>>> Save(Guid eventId, SaveBody body, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new SaveStationsCommand(eventId, body.Stations), ct));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<IReadOnlyList<StationStatDto>>> Summary(Guid eventId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new StationsSummaryQuery(eventId), ct));
    }

    public sealed record SaveBody(IReadOnlyList<StationInput> Stations);
}
