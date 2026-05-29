using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Logistics;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/events/{eventId:guid}/transfers")]
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class TransfersController : ControllerBase
{
    private readonly IMediator _mediator;

    public TransfersController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TransferDto>>> List(Guid eventId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new ListTransfersQuery(eventId), ct));
    }

    [HttpPost]
    public async Task<ActionResult<TransferDto>> Create(Guid eventId, TransferBody body, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(
            new CreateTransferCommand(eventId, body.Name, body.DepartureTime, body.MeetingPoint, body.Note), ct));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid eventId, Guid id, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        await _mediator.Send(new DeleteTransferCommand(id), ct);
        return NoContent();
    }

    public sealed record TransferBody(string Name, DateTimeOffset DepartureTime, string MeetingPoint, string? Note);
}
