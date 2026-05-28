using EventPulse.Shared.Multitenancy;

namespace EventPulse.Api.Middleware;

/// <summary>
/// Resolves the current tenant from the authenticated principal's <c>tenant_id</c> claim and
/// records it in the scoped <see cref="ITenantContext"/>. Unauthenticated requests stay tenant-less,
/// so tenant-scoped queries return nothing rather than leaking data.
/// </summary>
public sealed class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ITenantContext tenant)
    {
        var claim = context.User.FindFirst("tenant_id")?.Value;
        if (Guid.TryParse(claim, out var tenantId))
        {
            tenant.SetTenant(tenantId);
        }

        await _next(context);
    }
}
