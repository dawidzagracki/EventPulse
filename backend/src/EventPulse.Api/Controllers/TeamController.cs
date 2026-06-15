using EventPulse.Modules.Identity.Application.Team;
using EventPulse.Modules.Identity.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

/// <summary>
/// Account provisioning — only an agency super admin can add other agency accounts
/// or client (mini-admin) accounts. Operators are issued ephemeral links elsewhere;
/// participants are invited per-event.
/// </summary>
[ApiController]
[Route("api/team")]
[Authorize(Policy = AuthPolicies.Agency)]
public sealed class TeamController : ControllerBase
{
    private readonly IMediator _mediator;

    public TeamController(IMediator mediator) => _mediator = mediator;

    [HttpGet("admins")]
    public async Task<ActionResult<IReadOnlyList<AdminDto>>> Admins(CancellationToken ct)
        => Ok(await _mediator.Send(new ListAdminsQuery(), ct));

    [HttpPost("admins")]
    public async Task<ActionResult<AdminDto>> CreateAdmin(CreateAgencyUserBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateAgencyUserCommand(body.Email, body.DisplayName, body.Password, body.Role ?? "Admin"), ct));

    [HttpPut("admins/{id:guid}")]
    public async Task<ActionResult<AdminDto>> UpdateAdmin(Guid id, UpdateAgencyUserBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateAgencyUserCommand(id, body.DisplayName, body.Role ?? "Admin", body.IsActive, body.NewPassword), ct));

    [HttpGet("clients")]
    public async Task<ActionResult<IReadOnlyList<ClientDto>>> Clients(CancellationToken ct)
        => Ok(await _mediator.Send(new ListClientsQuery(), ct));

    [HttpPost("clients")]
    public async Task<ActionResult<ClientDto>> CreateClient(CreateClientBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateClientCommand(body.Email, body.DisplayName, body.Password), ct));

    [HttpPut("clients/{id:guid}")]
    public async Task<ActionResult<ClientDto>> UpdateClient(Guid id, UpdateClientBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateClientCommand(id, body.DisplayName, body.IsActive, body.NewPassword), ct));

    public sealed record CreateAgencyUserBody(string Email, string DisplayName, string Password, string? Role);
    public sealed record CreateClientBody(string Email, string DisplayName, string Password);
    public sealed record UpdateAgencyUserBody(string DisplayName, string? Role, bool IsActive, string? NewPassword);
    public sealed record UpdateClientBody(string DisplayName, bool IsActive, string? NewPassword);
}
