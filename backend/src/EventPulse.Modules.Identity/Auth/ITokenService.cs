using EventPulse.Modules.Identity.Domain;

namespace EventPulse.Modules.Identity.Auth;

public interface ITokenService
{
    (string token, DateTimeOffset expiresAt) CreateAccessToken(
        Guid principalId,
        PrincipalType principalType,
        Guid tenantId,
        string email,
        string? role);
}
