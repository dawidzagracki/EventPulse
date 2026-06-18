using System.Text.Json;
using EventPulse.Modules.Participants.Domain;

namespace EventPulse.Modules.Participants.Application.Me;

public sealed record MyProfileDto(
    Guid Id,
    Guid EventId,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string Language,
    ParticipantStatus Status,
    bool HasAcceptedRodo,
    bool PhotoConsent,
    bool NetworkingConsent,
    string? DietaryPreferences,
    string? ShirtSize,
    string? Wishes,
    bool AirportTransfer,
    string? ArrivalTime,
    string? FlightNumber,
    string? TableName,
    string? RoomNumber,
    string? GroupName,
    string? HotelName,
    string? HotelAddress,
    string? HotelPhone,
    IReadOnlyDictionary<string, string> CustomFields,
    bool OnboardingCompleted)
{
    public static MyProfileDto From(Participant p) => new(
        p.Id, p.EventId, p.FirstName, p.LastName, p.Email, p.Phone, p.Language, p.Status,
        p.HasAcceptedRodo, p.PhotoConsent, p.NetworkingConsent,
        p.DietaryPreferences, p.ShirtSize, p.Wishes,
        p.AirportTransfer, p.ArrivalTime, p.FlightNumber,
        p.TableName, p.RoomNumber, p.GroupName,
        p.HotelName, p.HotelAddress, p.HotelPhone,
        ParseCustomFields(p.CustomFieldsJson), p.OnboardingCompletedAt is not null);

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
