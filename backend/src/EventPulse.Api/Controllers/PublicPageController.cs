using EventPulse.Modules.Content.Application;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

/// <summary>Anonymous read of the published event page (for participants and public visitors).</summary>
[ApiController]
[Route("api/public/events/{eventId:guid}/page")]
[AllowAnonymous]
public sealed class PublicPageController : ControllerBase
{
    private readonly IMediator _mediator;

    public PublicPageController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<PublishedPageDto>> Get(Guid eventId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetPublishedPageQuery(eventId), ct));
}
