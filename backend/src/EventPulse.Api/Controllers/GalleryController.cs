using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Gallery;
using EventPulse.Modules.Identity.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/events/{eventId:guid}/gallery")]
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class GalleryController : ControllerBase
{
    private readonly IMediator _mediator;

    public GalleryController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PhotoDto>>> List(Guid eventId, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        return Ok(await _mediator.Send(new ListPhotosQuery(eventId, OnlyPublished: false), ct));
    }

    [HttpPost]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<PhotoDto>> Upload(Guid eventId, IFormFile file, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { error = "Empty file." });
        }

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);

        var dto = await _mediator.Send(
            new UploadPhotoCommand(eventId, file.FileName, file.ContentType, ms.ToArray()), ct);
        return Ok(dto);
    }

    [HttpGet("{id:guid}/file")]
    public async Task<IActionResult> File(Guid eventId, Guid id, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        var stored = await _mediator.Send(new GetPhotoFileQuery(id, RequirePublished: false), ct);
        return File(stored.Content, stored.ContentType);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid eventId, Guid id, CancellationToken ct)
    {
        await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        await _mediator.Send(new DeletePhotoCommand(id), ct);
        return NoContent();
    }
}
