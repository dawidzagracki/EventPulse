using EventPulse.Modules.Identity.Application;
using EventPulse.Modules.Identity.Domain;
using EventPulse.Shared.Persistence;
using Microsoft.Extensions.Options;

namespace EventPulse.Modules.Identity.Auth;

/// <summary>Creates an access token and a persisted (hashed) refresh token for a principal.</summary>
public sealed class TokenIssuer
{
    private readonly IAppDbContext _db;
    private readonly ITokenService _tokens;
    private readonly JwtOptions _options;

    public TokenIssuer(IAppDbContext db, ITokenService tokens, IOptions<JwtOptions> options)
    {
        _db = db;
        _tokens = tokens;
        _options = options.Value;
    }

    public async Task<AuthResult> IssueAsync(
        Guid principalId,
        PrincipalType principalType,
        Guid tenantId,
        string email,
        string? role,
        string displayName,
        CancellationToken cancellationToken)
    {
        var (accessToken, accessExpiresAt) = _tokens.CreateAccessToken(principalId, principalType, tenantId, email, role);

        var secret = TokenHasher.NewSecret();
        _db.Set<RefreshToken>().Add(new RefreshToken
        {
            PrincipalId = principalId,
            PrincipalType = principalType,
            TenantId = tenantId,
            TokenHash = TokenHasher.Hash(secret),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(_options.RefreshTokenDays),
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await _db.SaveChangesAsync(cancellationToken);

        return new AuthResult(accessToken, secret, accessExpiresAt, principalType.ToString(), tenantId, displayName, role);
    }
}
