namespace EventPulse.Modules.Identity.Application;

public sealed record AuthResult(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset AccessExpiresAt,
    string PrincipalType,
    Guid TenantId,
    string DisplayName,
    string? Role);
