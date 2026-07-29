namespace EventPulse.Modules.Identity.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "eventpulse";
    public string Audience { get; set; } = "eventpulse";
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 14;
    public int ParticipantTokenHours { get; set; } = 12;

    /// <summary>
    /// Operator (door staff) shift token. Operators get no refresh token, so this is the whole
    /// lifetime of their link — a day was too short: a link handed out before the event, or the
    /// morning of a two-day event, died mid-shift with no warning.
    /// </summary>
    public int OperatorTokenDays { get; set; } = 7;
}
