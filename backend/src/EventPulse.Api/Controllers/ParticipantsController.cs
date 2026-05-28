using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Participants.Application;
using EventPulse.Modules.Participants.Application.Commands;
using EventPulse.Modules.Participants.Application.Import;
using EventPulse.Modules.Participants.Application.Qr;
using EventPulse.Modules.Participants.Application.Queries;
using EventPulse.Modules.Participants.Domain;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/events/{eventId:guid}/participants")]
[Authorize(Policy = AuthPolicies.Agency)]
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
        var baseUrl = _configuration["App:ParticipantLinkBaseUrl"] ?? "http://localhost:5173/p";
        var png = await _mediator.Send(new GetParticipantQrQuery(id, baseUrl), ct);
        return File(png, "image/png");
    }

    // Throws NotFound (tenant-filtered) if the event isn't owned by the caller's tenant.
    private Task EnsureEventInTenantAsync(Guid eventId, CancellationToken ct)
        => _mediator.Send(new GetEventByIdQuery(eventId), ct);

    public sealed record AddParticipantBody(
        string FirstName,
        string LastName,
        string Email,
        string? Phone,
        string? Company,
        string? Position,
        string? Language);

    public sealed record ChangeStatusBody(ParticipantStatus Status);
}
