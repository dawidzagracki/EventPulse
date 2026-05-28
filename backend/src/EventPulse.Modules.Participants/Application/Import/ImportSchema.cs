namespace EventPulse.Modules.Participants.Application.Import;

/// <summary>The fixed Excel template (columns A–O, row 1 = headers) the client must supply.</summary>
public static class ImportSchema
{
    public const int MaxRows = 2000;

    // Order is fixed and must match the template exactly.
    public static readonly string[] Headers =
    [
        "Imię",            // A  *required
        "Nazwisko",        // B  *required
        "Email",           // C  *required
        "Telefon",         // D
        "Firma",           // E
        "Stanowisko",      // F
        "Język",           // G  PL/EN
        "Grupa",           // H
        "Stolik",          // I
        "Pokój",           // J
        "Transfer lotnisko", // K  TAK/NIE
        "Godzina przylotu",  // L
        "Numer lotu",      // M
        "Preferencje żywieniowe", // N
        "Uwagi",           // O
    ];
}

public sealed record RowError(int RowNumber, string Message);

public sealed class ParticipantImportRow
{
    public int RowNumber { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public string? Company { get; init; }
    public string? Position { get; init; }
    public string Language { get; init; } = "pl";
    public string? GroupName { get; init; }
    public string? TableName { get; init; }
    public string? RoomNumber { get; init; }
    public bool AirportTransfer { get; init; }
    public string? ArrivalTime { get; init; }
    public string? FlightNumber { get; init; }
    public string? DietaryPreferences { get; init; }
    public string? Notes { get; init; }
}
