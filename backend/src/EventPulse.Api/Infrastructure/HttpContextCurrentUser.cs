using EventPulse.Modules.Identity.Auth;
using EventPulse.Shared.Application;

namespace EventPulse.Api.Infrastructure;

public sealed class HttpContextCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public Guid? UserId
    {
        get
        {
            var sub = accessor.HttpContext?.User?.FindFirst("sub")?.Value;
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public string? PrincipalType => accessor.HttpContext?.User?.FindFirst(AppClaims.PrincipalType)?.Value;

    // MapInboundClaims is disabled, so the JWT "email" claim is preserved verbatim.
    public string? Email => accessor.HttpContext?.User?.FindFirst("email")?.Value;

    public Guid? EventId
    {
        get
        {
            var raw = accessor.HttpContext?.User?.FindFirst(AppClaims.EventId)?.Value;
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }
}
