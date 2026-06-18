using EventPulse.Api.Branding;
using EventPulse.Modules.Identity.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

/// <summary>Auto-branding: derive colours + logo from a website URL for the page builder.</summary>
[ApiController]
[Route("api/branding")]
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class BrandingController : ControllerBase
{
    private readonly IMediator _mediator;

    public BrandingController(IMediator mediator) => _mediator = mediator;

    [HttpPost("extract")]
    public async Task<ActionResult<BrandingSuggestionDto>> Extract(ExtractBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new ExtractBrandingCommand(body.Url), ct));

    public sealed record ExtractBody(string Url);
}
