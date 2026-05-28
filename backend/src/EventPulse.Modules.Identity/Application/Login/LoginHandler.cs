using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Identity.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Identity.Application.Login;

public sealed class LoginHandler : IRequestHandler<LoginCommand, AuthResult>
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly TokenIssuer _issuer;

    public LoginHandler(IAppDbContext db, IPasswordHasher hasher, TokenIssuer issuer)
    {
        _db = db;
        _hasher = hasher;
        _issuer = issuer;
    }

    public async Task<AuthResult> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        // Cross-tenant lookups: login happens before a tenant is resolved, so bypass the query filter.
        var user = await _db.Set<User>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

        if (user is { IsActive: true } && _hasher.Verify(request.Password, user.PasswordHash))
        {
            return await _issuer.IssueAsync(
                user.Id, PrincipalType.Agency, user.TenantId, user.Email, user.Role.ToString(), user.DisplayName, cancellationToken);
        }

        var client = await _db.Set<ClientUser>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Email == email, cancellationToken);

        if (client is { IsActive: true, PasswordHash: not null } && _hasher.Verify(request.Password, client.PasswordHash))
        {
            return await _issuer.IssueAsync(
                client.Id, PrincipalType.Client, client.TenantId, client.Email, "Client", client.DisplayName, cancellationToken);
        }

        throw new UnauthorizedAppException();
    }
}
