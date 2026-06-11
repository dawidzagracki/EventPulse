namespace EventPulse.Shared.Application;

/// <summary>Current authenticated user info, resolved from the request context.</summary>
public interface ICurrentUser
{
    Guid? UserId { get; }
    string? PrincipalType { get; }

    /// <summary>E-mail from the auth token. Used to scope a Client to their own events.</summary>
    string? Email { get; }

    /// <summary>True when the caller is a Client end-user (not Agency staff).</summary>
    bool IsClient => string.Equals(PrincipalType, "Client", StringComparison.OrdinalIgnoreCase);

    /// <summary>True when the caller is a short-lived QR-scanner Operator session.</summary>
    bool IsOperator => string.Equals(PrincipalType, "Operator", StringComparison.OrdinalIgnoreCase);

    /// <summary>Event id the token is scoped to (Operator sessions only).</summary>
    Guid? EventId { get; }
}
