using System.Text.Json;
using EventPulse.Shared.Domain;
using EventPulse.Shared.Persistence;
using MediatR;

namespace EventPulse.Shared.Application;

/// <summary>
/// Pipeline behavior that records an audit log entry for every successful write command (class name
/// ends with "Command"). Read queries and unauthenticated requests are skipped.
/// </summary>
public sealed class AuditLoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = false };

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public AuditLoggingBehavior(IAppDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var response = await next();

        var typeName = typeof(TRequest).Name;
        if (!typeName.EndsWith("Command", StringComparison.Ordinal) || _user.UserId is null)
        {
            return response;
        }

        _db.Set<AuditLog>().Add(new AuditLog
        {
            UserId = _user.UserId,
            PrincipalType = _user.PrincipalType,
            Action = typeName,
            Payload = TrySerialize(request),
        });

        await _db.SaveChangesAsync(cancellationToken);
        return response;
    }

    private static string? TrySerialize(TRequest request)
    {
        try
        {
            return JsonSerializer.Serialize(request, JsonOptions);
        }
        catch
        {
            return null;
        }
    }
}
