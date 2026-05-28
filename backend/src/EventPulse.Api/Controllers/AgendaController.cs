using EventPulse.Modules.Agenda.Application;
using EventPulse.Modules.Events.Application;
using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
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

    public AgendaController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AgendaItemDto>>> List(Guid eventId, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new ListAgendaQuery(eventId), ct));
    }

    [HttpPost]
    public async Task<ActionResult<AgendaItemDto>> Create(Guid eventId, AgendaItemInput input, CancellationToken ct)
    {
        var ev = await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new CreateAgendaItemCommand(eventId, ev.Name, input), ct));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AgendaItemDto>> Update(Guid eventId, Guid id, AgendaItemInput input, CancellationToken ct)
    {
        var ev = await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new UpdateAgendaItemCommand(id, ev.Name, input), ct));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid eventId, Guid id, CancellationToken ct)
    {
        var ev = await EnsureEventAsync(eventId, ct);
        await _mediator.Send(new DeleteAgendaItemCommand(id, ev.Name), ct);
        return NoContent();
    }

    private Task<EventDto> EnsureEventAsync(Guid eventId, CancellationToken ct)
        => _mediator.Send(new GetEventByIdQuery(eventId), ct);
}
