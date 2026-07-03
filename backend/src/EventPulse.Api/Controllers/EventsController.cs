using EventPulse.Modules.Events.Application;
using EventPulse.Modules.Events.Application.Clients;
using EventPulse.Modules.Events.Application.Create;
using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Events.Application.Update;
using EventPulse.Modules.Events.Domain;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Identity.Domain;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/events")]
// Class-level: Agency staff OR the assigned Client (mini-admin of one event).
// Query handlers scope a Client to their own events. Mutations that a Client
// must not perform (create/delete) carry an extra Agency-only [Authorize].
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class EventsController : ControllerBase
{
    private readonly IMediator _mediator;

    public EventsController(IMediator mediator) => _mediator = mediator;

    /// <summary>
    /// Mints a short-lived JWT scoped to one event for QR-operator hostessy/ochronę.
    /// Agency-only: the staff member then shares the resulting URL with the operator.
    /// </summary>
    [HttpPost("{id:guid}/operator-link")]
    [Authorize(Policy = AuthPolicies.Agency)]
    public async Task<ActionResult<OperatorLinkResult>> CreateOperatorLink(
        Guid id,
        [FromServices] ITokenService tokens,
        [FromServices] EventPulse.Infrastructure.Persistence.AppDbContext db,
        CancellationToken ct)
    {
        var ev = await _mediator.Send(new GetEventByIdQuery(id), ct);
        var tenantId = await db.Set<Event>().Where(e => e.Id == id).Select(e => e.TenantId).FirstAsync(ct);
        // Operator JWT inherits the event's tenant so scans land in the right tenant scope.
        var (token, expiresAt) = tokens.CreateAccessToken(
            principalId: Guid.NewGuid(), // synthetic — operator has no user record
            principalType: PrincipalType.Operator,
            tenantId: tenantId,
            email: $"operator+{id:N}@eventpulse.local",
            role: null,
            eventId: id);
        return Ok(new OperatorLinkResult(token, expiresAt, ev.Id, ev.Name));
    }

    public sealed record OperatorLinkResult(string AccessToken, DateTimeOffset ExpiresAt, Guid EventId, string EventName);

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
    [Authorize(Policy = AuthPolicies.Agency)]
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

    [HttpPut("{id:guid}/settings")]
    public async Task<ActionResult<EventDto>> UpdateSettings(Guid id, UpdateEventSettingsBody body, CancellationToken ct)
    {
        var command = new UpdateEventSettingsCommand(
            id,
            body.UsesLocationData,
            body.PhoneRequired,
            body.AllowCompanions,
            body.MaxCompanions,
            body.AnonymizeEnabled,
            body.AnonymizeAfterDays,
            body.CustomPhotosUrl,
            body.CustomPhotosText,
            body.ShowAgendaTab,
            body.ShowActivitiesTab,
            body.ShowGalleryTab,
            body.ShowPreferencesTile);
        return Ok(await _mediator.Send(command, ct));
    }

    [HttpPut("{id:guid}/slug")]
    public async Task<ActionResult<EventDto>> UpdateSlug(Guid id, UpdateSlugBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateEventSlugCommand(id, body.Slug), ct));

    /// <summary>Client accounts granted access to this event (ids only). Agency-only.</summary>
    [HttpGet("{id:guid}/clients")]
    [Authorize(Policy = AuthPolicies.Agency)]
    public async Task<ActionResult<IReadOnlyList<Guid>>> GetClients(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetEventClientsQuery(id), ct));

    /// <summary>Replaces the set of client accounts that may access this event. Agency-only.</summary>
    [HttpPut("{id:guid}/clients")]
    [Authorize(Policy = AuthPolicies.Agency)]
    public async Task<ActionResult<IReadOnlyList<Guid>>> SetClients(Guid id, SetClientsBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new SetEventClientsCommand(id, body.ClientUserIds ?? new List<Guid>()), ct));

    public sealed record SetClientsBody(List<Guid> ClientUserIds);

    [HttpPost("{id:guid}/status")]
    public async Task<ActionResult<EventDto>> ChangeStatus(Guid id, ChangeStatusBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new ChangeEventStatusCommand(id, body.NewStatus), ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthPolicies.Agency)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeleteEventCommand(id), ct);
        return NoContent();
    }

    public sealed record UpdateEventBody(
        string Name,
        DateTimeOffset StartsAt,
        DateTimeOffset EndsAt,
        string? Location,
        string? Description,
        string? DefaultLanguage,
        string? ClientEmail);

    public sealed record ChangeStatusBody(EventStatus NewStatus);

    public sealed record UpdateSlugBody(string Slug);

    public sealed record UpdateEventSettingsBody(
        bool UsesLocationData,
        bool PhoneRequired,
        bool AllowCompanions,
        int MaxCompanions,
        bool AnonymizeEnabled,
        int AnonymizeAfterDays,
        string? CustomPhotosUrl,
        string? CustomPhotosText,
        bool ShowAgendaTab = true,
        bool ShowActivitiesTab = true,
        bool ShowGalleryTab = true,
        bool ShowPreferencesTile = true);
}
