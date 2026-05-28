using System.IdentityModel.Tokens.Jwt;
using EventPulse.Modules.Identity.Application;
using EventPulse.Modules.Identity.Application.Login;
using EventPulse.Modules.Identity.Application.Refresh;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Participants.Application.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator) => _mediator = mediator;

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResult>> Login(LoginCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResult>> Refresh(RefreshCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    [HttpPost("participant")]
    [AllowAnonymous]
    public async Task<ActionResult<ParticipantLoginResult>> ParticipantLogin(ParticipantLoginCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    [HttpGet("me")]
    [Authorize]
    public ActionResult Me() => Ok(new
    {
        id = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value,
        email = User.FindFirst(JwtRegisteredClaimNames.Email)?.Value,
        tenantId = User.FindFirst(AppClaims.TenantId)?.Value,
        principalType = User.FindFirst(AppClaims.PrincipalType)?.Value,
        role = User.FindFirst(AppClaims.Role)?.Value,
    });
}
