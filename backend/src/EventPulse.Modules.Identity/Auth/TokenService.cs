using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EventPulse.Modules.Identity.Domain;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace EventPulse.Modules.Identity.Auth;

public sealed class TokenService : ITokenService
{
    private readonly JwtOptions _options;

    public TokenService(IOptions<JwtOptions> options) => _options = options.Value;

    public (string token, DateTimeOffset expiresAt) CreateAccessToken(
        Guid principalId,
        PrincipalType principalType,
        Guid tenantId,
        string email,
        string? role,
        Guid? eventId = null)
    {
        var now = DateTimeOffset.UtcNow;
        var expiresAt = principalType switch
        {
            PrincipalType.Participant => now.AddHours(_options.ParticipantTokenHours),
            PrincipalType.Operator => now.AddHours(24), // long-lived event-shift token
            _ => now.AddMinutes(_options.AccessTokenMinutes),
        };

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, principalId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(AppClaims.TenantId, tenantId.ToString()),
            new(AppClaims.PrincipalType, principalType.ToString()),
        };

        if (!string.IsNullOrWhiteSpace(role))
        {
            claims.Add(new Claim(AppClaims.Role, role));
        }

        if (eventId is { } evId)
        {
            claims.Add(new Claim(AppClaims.EventId, evId.ToString()));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        var jwt = new JwtSecurityTokenHandler().WriteToken(token);
        return (jwt, expiresAt);
    }
}
