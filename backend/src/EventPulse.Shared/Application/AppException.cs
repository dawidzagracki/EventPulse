namespace EventPulse.Shared.Application;

/// <summary>Base for domain/application errors that map to specific HTTP status codes.</summary>
public abstract class AppException(string message) : Exception(message)
{
    public abstract int StatusCode { get; }
}

public sealed class NotFoundException(string message) : AppException(message)
{
    public override int StatusCode => StatusCodes.NotFound;
}

public sealed class ConflictException(string message) : AppException(message)
{
    public override int StatusCode => StatusCodes.Conflict;
}

public sealed class UnauthorizedAppException(string message = "Invalid credentials.") : AppException(message)
{
    public override int StatusCode => StatusCodes.Unauthorized;
}

public sealed class ForbiddenAppException(string message = "Access denied.") : AppException(message)
{
    public override int StatusCode => StatusCodes.Forbidden;
}

internal static class StatusCodes
{
    public const int Unauthorized = 401;
    public const int Forbidden = 403;
    public const int NotFound = 404;
    public const int Conflict = 409;
}
