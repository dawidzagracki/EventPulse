using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Scanning.Application;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthPolicies.ScannerAccess)]
public sealed class ScansController : ControllerBase
{
    private readonly IMediator _mediator;

    public ScansController(IMediator mediator) => _mediator = mediator;

    /// <summary>Bulk-ingests scans from the (possibly offline) scanner. Idempotent by clientId.</summary>
    [HttpPost("api/events/{eventId:guid}/scans/batch")]
    public async Task<ActionResult<BatchScanResult>> Batch(Guid eventId, BatchScanBody body, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct); // verify tenant ownership
        return Ok(await _mediator.Send(new BatchScanCommand(eventId, body.Items), ct));
    }

    [HttpPost("api/events/{eventId:guid}/no-shows")]
    public async Task<ActionResult<object>> MarkNoShows(Guid eventId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        var count = await _mediator.Send(new MarkNoShowsCommand(eventId), ct);
        return Ok(new { marked = count });
    }

    /// <summary>Active stations the operator can scan at (reachable with an operator token).</summary>
    [HttpGet("api/events/{eventId:guid}/scanner/stations")]
    public async Task<ActionResult<IReadOnlyList<StationDto>>> ScannerStations(Guid eventId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new ListActiveStationsQuery(eventId), ct));
    }

    public sealed record BatchScanBody(List<ScanInput> Items);
}
