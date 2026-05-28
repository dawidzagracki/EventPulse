using MediatR;

namespace EventPulse.Modules.Identity.Application.Refresh;

public sealed record RefreshCommand(string RefreshToken) : IRequest<AuthResult>;
