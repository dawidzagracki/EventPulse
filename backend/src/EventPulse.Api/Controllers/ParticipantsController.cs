using EventPulse.Modules.Events.Application;
using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Participants.Application;
using EventPulse.Modules.Participants.Application.Commands;
using EventPulse.Modules.Participants.Application.Export;
using EventPulse.Modules.Participants.Application.Import;
using EventPulse.Modules.Participants.Application.Invitations;
using EventPulse.Modules.Participants.Application.Qr;
using EventPulse.Modules.Participants.Application.Queries;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/events/{eventId:guid}/participants")]
// Agency staff OR the assigned Client (mini-admin). Event ownership is verified
// per-request via GetEventByIdQuery, which scopes a Client to their own event.
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class ParticipantsController : ControllerBase
{
    private const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly IMediator _mediator;
    private readonly IConfiguration _configuration;

    public ParticipantsController(IMediator mediator, IConfiguration configuration)
    {
        _mediator = mediator;
        _configuration = configuration;
    }

    [HttpGet("template")]
    public IActionResult DownloadTemplate()
        => File(ImportTemplate.Build(), XlsxContentType, "eventpulse-uczestnicy-szablon.xlsx");

    /// <summary>Exports all participants (with statuses + check-in/out times) to .xlsx (spec §5.3).</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export(Guid eventId, CancellationToken ct)
    {
        await EnsureEventInTenantAsync(eventId, ct);
        var bytes = await _mediator.Send(new ExportParticipantsQuery(eventId), ct);
        return File(bytes, XlsxContentType, "eventpulse-uczestnicy.xlsx");
    }

    [HttpPost("import")]
    public async Task<ActionResult<ImportResultDto>> Import(
        Guid eventId,
        IFormFile file,
        [FromQuery] bool commit,
        CancellationToken ct)
    {
        await EnsureEventInTenantAsync(eventId, ct);

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { error = "Plik jest pusty." });
        }

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);

        var result = await _mediator.Send(new ImportParticipantsCommand(eventId, ms.ToArray(), commit), ct);
        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ParticipantDto>>> List(
        Guid eventId,
        [FromQuery] ParticipantStatus? status,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        await EnsureEventInTenantAsync(eventId, ct);
        return Ok(await _mediator.Send(new ListParticipantsQuery(eventId, status, search), ct));
    }

    [HttpPost]
    public async Task<ActionResult<ParticipantDto>> Add(Guid eventId, AddParticipantBody body, CancellationToken ct)
    {
        await EnsureEventInTenantAsync(eventId, ct);
        var command = new AddParticipantCommand(
            eventId, body.FirstName, body.LastName, body.Email, body.Phone, body.Company, body.Position, body.Language);
        return Ok(await _mediator.Send(command, ct));
    }

    [HttpPost("{id:guid}/status")]
    public async Task<ActionResult<ParticipantDto>> ChangeStatus(
        Guid eventId, Guid id, ChangeStatusBody body, CancellationToken ct)
    {
        await EnsureEventInTenantAsync(eventId, ct);
        return Ok(await _mediator.Send(new UpdateParticipantStatusCommand(id, body.Status), ct));
    }

    [HttpGet("{id:guid}/qr")]
    public async Task<IActionResult> Qr(Guid eventId, Guid id, CancellationToken ct)
    {
        await EnsureEventInTenantAsync(eventId, ct);
        var png = await _mediator.Send(new GetParticipantQrQuery(id, ParticipantLinkBaseUrl), ct);
        return File(png, "image/png");
    }

    [HttpPost("invitations")]
    public async Task<ActionResult<SendInvitationsResult>> SendInvitations(
        Guid eventId,
        [FromQuery] bool onlyNotInvited,
        CancellationToken ct)
    {
        var ev = await EnsureEventInTenantAsync(eventId, ct);
        var result = await _mediator.Send(
            new SendInvitationsCommand(eventId, ev.Name, ev.StartsAt, ParticipantLinkBaseUrl, onlyNotInvited), ct);
        return Ok(result);
    }

    /// <summary>Emails the event's client a single digest of all participant login links, to distribute themselves.</summary>
    [HttpPost("client-links")]
    [Authorize(Policy = AuthPolicies.Agency)]
    public async Task<ActionResult<SendClientLinksResult>> SendClientLinks(Guid eventId, CancellationToken ct)
    {
        var ev = await EnsureEventInTenantAsync(eventId, ct);
        if (string.IsNullOrWhiteSpace(ev.ClientEmail))
        {
            throw new ConflictException("Set the client e-mail on the event first (Przegląd).");
        }

        var result = await _mediator.Send(
            new SendClientLinksCommand(eventId, ev.Name, ev.ClientEmail, ParticipantLinkBaseUrl), ct);
        return Ok(result);
    }

    private string ParticipantLinkBaseUrl =>
        _configuration["App:ParticipantLinkBaseUrl"] ?? "http://localhost:5173/p";

    // Throws NotFound (tenant-filtered) if the event isn't owned by the caller's tenant.
    private Task<EventDto> EnsureEventInTenantAsync(Guid eventId, CancellationToken ct)
        => _mediator.Send(new GetEventByIdQuery(eventId), ct);

    public sealed record AddParticipantBody(
        string FirstName,
        string LastName,
        string Email,
        string? Phone,
        string? Company,
        string? Position,
        string? Language);

    [HttpPost("{id:guid}/logistics")]
    public async Task<ActionResult<ParticipantDto>> Logistics(Guid eventId, Guid id, LogisticsBody body, CancellationToken ct)
    {
        await EnsureEventInTenantAsync(eventId, ct);
        return Ok(await _mediator.Send(new UpdateParticipantLogisticsCommand(
            id, body.GroupName, body.TableName, body.RoomNumber, body.HotelName, body.HotelAddress, body.HotelPhone), ct));
    }

    public sealed record ChangeStatusBody(ParticipantStatus Status);

    public sealed record LogisticsBody(
        string? GroupName,
        string? TableName,
        string? RoomNumber,
        string? HotelName,
        string? HotelAddress,
        string? HotelPhone);
}
