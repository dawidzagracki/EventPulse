using EventPulse.Modules.Events.Application;
using EventPulse.Modules.Events.Application.Create;
using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Events.Application.Update;
using EventPulse.Modules.Events.Domain;
using EventPulse.Modules.Identity.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/events")]
[Authorize(Policy = AuthPolicies.Agency)]
public sealed class EventsController : ControllerBase
{
    private readonly IMediator _mediator;

    public EventsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EventDto>>> List(
        [FromQuery] EventStatus? status,
        [FromQuery] string? search,
        CancellationToken ct)
        => Ok(await _mediator.Send(new ListEventsQuery(status, search), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EventDto>> Get(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetEventByIdQuery(id), ct));

    [HttpPost]
    public async Task<ActionResult<EventDto>> Create(CreateEventCommand command, CancellationToken ct)
    {
        var created = await _mediator.Send(command, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<EventDto>> Update(Guid id, UpdateEventBody body, CancellationToken ct)
    {
        var command = new UpdateEventCommand(
            id, body.Name, body.StartsAt, body.EndsAt, body.Location, body.Description, body.DefaultLanguage, body.ClientEmail);
        return Ok(await _mediator.Send(command, ct));
    }

    [HttpPost("{id:guid}/status")]
    public async Task<ActionResult<EventDto>> ChangeStatus(Guid id, ChangeStatusBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new ChangeEventStatusCommand(id, body.NewStatus), ct));

    public sealed record UpdateEventBody(
        string Name,
        DateTimeOffset StartsAt,
        DateTimeOffset EndsAt,
        string? Location,
        string? Description,
        string? DefaultLanguage,
        string? ClientEmail);

    public sealed record ChangeStatusBody(EventStatus NewStatus);
}
