namespace EventPulse.Modules.Identity.Auth;

/// <summary>Custom JWT claim names shared by token issuance, the tenant middleware, and policies.</summary>
public static class AppClaims
{
    public const string TenantId = "tenant_id";
    public const string PrincipalType = "principal_type";
    public const string Role = "role";
}
