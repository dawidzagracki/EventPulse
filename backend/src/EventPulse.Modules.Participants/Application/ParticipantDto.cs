using System.Text.Json;
using EventPulse.Modules.Participants.Domain;

namespace EventPulse.Modules.Participants.Application;

public sealed record ParticipantDto(
    Guid Id,
    Guid EventId,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? Company,
    string? Position,
    string Language,
    string? GroupName,
    string? TableName,
    string? RoomNumber,
    bool AirportTransfer,
    string? DietaryPreferences,
    ParticipantStatus Status,
    Guid? ParentParticipantId,
    int? Age,
    Guid AccessToken,
    // Consents (RODO/photo/networking) + form answers — surfaced to the admin panel so
    // organisers can see what a guest actually submitted (previously only the guest could see it).
    bool HasAcceptedRodo,
    bool PhotoConsent,
    bool NetworkingConsent,
    string? ShirtSize,
    string? Wishes,
    IReadOnlyDictionary<string, string> CustomFields)
{
    public static ParticipantDto From(Participant p) => new(
        p.Id, p.EventId, p.FirstName, p.LastName, p.Email, p.Phone, p.Company, p.Position,
        p.Language, p.GroupName, p.TableName, p.RoomNumber, p.AirportTransfer, p.DietaryPreferences, p.Status,
        p.ParentParticipantId, p.Age, p.AccessToken,
        p.HasAcceptedRodo, p.PhotoConsent, p.NetworkingConsent, p.ShirtSize, p.Wishes,
        ParseCustomFields(p.CustomFieldsJson));

    private static IReadOnlyDictionary<string, string> ParseCustomFields(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new Dictionary<string, string>();
        }

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new Dictionary<string, string>();
        }
        catch (JsonException)
        {
            return new Dictionary<string, string>();
        }
    }
}
