using EventPulse.Modules.Agenda.Application;
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

    /// <summary>
    /// Points the operator can scan at: the event's own stations plus every agenda item flagged
    /// "requires QR check-in" (a coach, a dinner…). Agenda items are merged here because this is the
    /// only layer that sees both modules — Scanning and Agenda do not reference each other.
    /// </summary>
    [HttpGet("api/events/{eventId:guid}/scanner/stations")]
    public async Task<ActionResult<IReadOnlyList<StationDto>>> ScannerStations(Guid eventId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        var stations = await _mediator.Send(new ListActiveStationsQuery(eventId), ct);
        var agenda = await _mediator.Send(new ListAgendaQuery(eventId), ct);
        return Ok(stations.Concat(AgendaScanPoints(agenda)).ToList());
    }

    /// <summary>
    /// Agenda items that need a QR, as stations. They are presence points: CountsAsCheckIn = false
    /// makes the scanner record ScanKind.Station, so scanning someone onto a coach never touches the
    /// event check-in numbers. The station code is the item title, because every consumer
    /// (dashboard rollup, station summary, the scanner's own mode lookup) matches on that name.
    /// </summary>
    private static IEnumerable<StationDto> AgendaScanPoints(IReadOnlyList<AgendaItemDto> agenda)
        => agenda
            .Where(i => i.RequiresCheckIn)
            .OrderBy(i => i.StartsAt)
            .Select((item, index) => new StationDto(
                item.Id,
                item.TitlePl,
                item.TitleEn,
                item.CustomTypeIcon,
                ScanLimitPerParticipant: 0, // unlimited: the summary already separates scans from people
                CountsAsCheckIn: false,
                AllowSelfScan: false,       // nothing prints guest-facing QRs for agenda points
                Active: true,
                Order: 1000 + index));      // after the event's real stations

    public sealed record BatchScanBody(List<ScanInput> Items);
}
