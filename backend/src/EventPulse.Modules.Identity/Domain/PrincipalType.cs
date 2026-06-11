namespace EventPulse.Modules.Identity.Domain;

/// <summary>Which kind of account a JWT belongs to. Drives authorization policies.</summary>
public enum PrincipalType
{
    Agency = 0,
    Client = 1,
    Participant = 2,
    Operator = 3,
}
