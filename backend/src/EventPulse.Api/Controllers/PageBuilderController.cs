using System.Text.Json;
using EventPulse.Modules.Content.Application;
using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/events/{eventId:guid}/page")]
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class PageBuilderController : ControllerBase
{
    private readonly IMediator _mediator;

    public PageBuilderController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<PageDto>> GetDraft(Guid eventId, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new GetDraftQuery(eventId), ct));
    }

    [HttpPut]
    public async Task<ActionResult<PageDto>> SaveDraft(Guid eventId, [FromBody] JsonElement content, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new SaveDraftCommand(eventId, content.GetRawText()), ct));
    }

    [HttpPost("template/{key}")]
    public async Task<ActionResult<PageDto>> ApplyTemplate(Guid eventId, string key, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new ApplyTemplateCommand(eventId, key), ct));
    }

    [HttpPut("branding")]
    public async Task<ActionResult<PageDto>> UpdateBranding(Guid eventId, BrandingDto branding, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new UpdateBrandingCommand(eventId, branding), ct));
    }

    [HttpPut("seo")]
    public async Task<ActionResult<PageDto>> UpdateSeo(Guid eventId, SeoDto seo, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new UpdateSeoCommand(eventId, seo), ct));
    }

    /// <summary>Uploads a JPG/PNG logo (alternative to pasting a URL) and stores it on the page branding.</summary>
    [HttpPost("logo")]
    [RequestSizeLimit(5_000_000)]
    public async Task<ActionResult<PageDto>> UploadLogo(Guid eventId, IFormFile file, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { error = "Empty file." });
        }

        if (file.ContentType is not ("image/jpeg" or "image/png"))
        {
            return BadRequest(new { error = "Only JPG or PNG images are allowed." });
        }

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        return Ok(await _mediator.Send(new UploadLogoCommand(eventId, file.ContentType, ms.ToArray()), ct));
    }

    [HttpPost("publish")]
    public async Task<ActionResult<PageDto>> Publish(Guid eventId, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new PublishCommand(eventId), ct));
    }

    [HttpGet("versions")]
    public async Task<ActionResult<IReadOnlyList<PageVersionDto>>> Versions(Guid eventId, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new ListVersionsQuery(eventId), ct));
    }

    [HttpPost("versions/{version:int}/restore")]
    public async Task<ActionResult<PageDto>> Restore(Guid eventId, int version, CancellationToken ct)
    {
        await EnsureEventAsync(eventId, ct);
        return Ok(await _mediator.Send(new RestoreVersionCommand(eventId, version), ct));
    }

    private Task EnsureEventAsync(Guid eventId, CancellationToken ct) => _mediator.Send(new GetEventByIdQuery(eventId), ct);
}
