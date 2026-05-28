using MediatR;

namespace EventPulse.Modules.Identity.Application.Login;

public sealed record LoginCommand(string Email, string Password) : IRequest<AuthResult>;
