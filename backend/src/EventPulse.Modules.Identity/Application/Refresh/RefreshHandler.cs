using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Identity.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Identity.Application.Refresh;

public sealed class RefreshHandler : IRequestHandler<RefreshCommand, AuthResult>
{
    private readonly IAppDbContext _db;
    private readonly TokenIssuer _issuer;

    public RefreshHandler(IAppDbContext db, TokenIssuer issuer)
    {
        _db = db;
        _issuer = issuer;
    }

    public async Task<AuthResult> Handle(RefreshCommand request, CancellationToken cancellationToken)
    {
        var hash = TokenHasher.Hash(request.RefreshToken);

        var existing = await _db.Set<RefreshToken>()
            .FirstOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);

        if (existing is null || !existing.IsActive)
        {
            throw new UnauthorizedAppException("Invalid or expired refresh token.");
        }

        existing.RevokedAt = DateTimeOffset.UtcNow; // rotation: single-use refresh tokens

        return existing.PrincipalType switch
        {
            PrincipalType.Agency => await IssueForUserAsync(existing.PrincipalId, cancellationToken),
            PrincipalType.Client => await IssueForClientAsync(existing.PrincipalId, cancellationToken),
            _ => throw new UnauthorizedAppException(),
        };
    }

    private async Task<AuthResult> IssueForUserAsync(Guid userId, CancellationToken ct)
    {
        var user = await _db.Set<User>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user is not { IsActive: true })
        {
            throw new UnauthorizedAppException();
        }

        return await _issuer.IssueAsync(
            user.Id, PrincipalType.Agency, user.TenantId, user.Email, user.Role.ToString(), user.DisplayName, ct);
    }

    private async Task<AuthResult> IssueForClientAsync(Guid clientId, CancellationToken ct)
    {
        var client = await _db.Set<ClientUser>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == clientId, ct);

        if (client is not { IsActive: true })
        {
            throw new UnauthorizedAppException();
        }

        return await _issuer.IssueAsync(
            client.Id, PrincipalType.Client, client.TenantId, client.Email, "Client", client.DisplayName, ct);
    }
}
