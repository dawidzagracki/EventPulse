namespace EventPulse.Shared.Application;

/// <summary>Current authenticated user info, resolved from the request context.</summary>
public interface ICurrentUser
{
    Guid? UserId { get; }
    string? PrincipalType { get; }
}
