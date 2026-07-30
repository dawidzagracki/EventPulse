using EventPulse.Api.Infrastructure;
using EventPulse.Modules.Agenda.Application;
using EventPulse.Modules.Events.Application;
using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Scanning.Application;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/events/{eventId:guid}/agenda")]
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class AgendaController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IConfiguration _configuration;

    public AgendaController(IMediator mediator, IConfiguration configuration)
    {
        _mediator = mediator;
        _configuration = configuration;
    }

    /// <summary>Who scanned at each QR-checked agenda point, and when — the coach roll-call.</summary>
    [HttpGet("activity")]
    public async Task<ActionResult<IReadOnlyList<AgendaActivityDto>>> Activity(Guid eventId, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        var agenda = await _mediator.Send(new ListAgendaQuery(eventId), ct);
        var scans = await _mediator.Send(new StationScanLogQuery(eventId), ct);

        // Scans carry the item title as their station code (see ScansController.AgendaScanPoints).
        var byCode = scans
            .GroupBy(s => s.StationCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

        var result = agenda
            .Where(i => i.RequiresCheckIn)
            .OrderBy(i => i.StartsAt)
            .Select(item =>
            {
                var entries = byCode.TryGetValue(item.TitlePl, out var found) ? found : [];
                return new AgendaActivityDto(
                    item.Id,
                    item.TitlePl,
                    item.TitleEn,
                    item.CustomTypeIcon,
                    item.StartsAt,
                    entries.Count,
                    entries.Select(e => e.ParticipantId).Distinct().Count(),
                    entries
                        .OrderBy(e => e.OccurredAt)
                        .Select(e => new AgendaActivityEntryDto(e.ParticipantId, e.ParticipantName, e.OccurredAt))
                        .ToList());
            })
            .ToList();

        return Ok(result);
    }

    public sealed record AgendaActivityEntryDto(Guid ParticipantId, string ParticipantName, DateTimeOffset OccurredAt);

    public sealed record AgendaActivityDto(
        Guid AgendaItemId,
        string TitlePl,
        string TitleEn,
        string? Icon,
        DateTimeOffset StartsAt,
        int Scans,
        int People,
        IReadOnlyList<AgendaActivityEntryDto> Entries);

    /// <summary>
    /// Mails every guest the current agenda. Deliberately manual: agenda edits send nothing on
    /// their own, so the organiser decides when one notification goes out.
    /// </summary>
    [HttpPost("notify")]
    [Authorize(Policy = AuthPolicies.Agency)]
    public async Task<ActionResult<NotifyAgendaResult>> Notify(Guid eventId, CancellationToken ct)
    {
        var ev = await EnsureEventAsync(eventId, ct);
        var result = await _mediator.Send(
            new NotifyAgendaChangeCommand(
                eventId,
                ev.Name,
                EmailBrandFactory.ParticipantLinkBaseUrl(_configuration),
                EmailBrandFactory.For(ev)),
            ct);
        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AgendaItemDto>>> List(Guid eventId, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new ListAgendaQuery(eventId), ct));
    }

    [HttpGet("types")]
    public async Task<ActionResult<IReadOnlyList<AgendaTypeDto>>> Types(Guid eventId, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new ListAgendaTypesQuery(eventId), ct));
    }

    [HttpPut("types")]
    [Authorize(Policy = AuthPolicies.Agency)]
    public async Task<ActionResult<IReadOnlyList<AgendaTypeDto>>> SaveTypes(
        Guid eventId, SaveTypesBody body, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new SaveAgendaTypesCommand(eventId, body.Types), ct));
    }

    public sealed record SaveTypesBody(IReadOnlyList<AgendaTypeInput> Types);

    [HttpPost]
    [Authorize(Policy = AuthPolicies.Agency)]
    public async Task<ActionResult<AgendaItemDto>> Create(Guid eventId, AgendaItemInput input, CancellationToken ct)
    {
        var ev = await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new CreateAgendaItemCommand(eventId, ev.Name, input), ct));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthPolicies.Agency)]
    public async Task<ActionResult<AgendaItemDto>> Update(Guid eventId, Guid id, AgendaItemInput input, CancellationToken ct)
    {
        var ev = await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new UpdateAgendaItemCommand(id, ev.Name, input), ct));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthPolicies.Agency)]
    public async Task<IActionResult> Delete(Guid eventId, Guid id, CancellationToken ct)
    {
        var ev = await EnsureEventAsync(eventId, ct);
        await _mediator.Send(new DeleteAgendaItemCommand(id, ev.Name), ct);
        return NoContent();
    }

    private Task<EventDto> EnsureEventAsync(Guid eventId, CancellationToken ct)
        => _mediator.Send(new GetEventByIdQuery(eventId), ct);
}
