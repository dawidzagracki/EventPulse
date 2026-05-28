using EventPulse.Modules.Participants.Domain;

namespace EventPulse.Modules.Participants.Application.Me;

public sealed record MyProfileDto(
    Guid Id,
    Guid EventId,
    string FirstName,
    string LastName,
    string Email,
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
    string? GroupName)
{
    public static MyProfileDto From(Participant p) => new(
        p.Id, p.EventId, p.FirstName, p.LastName, p.Email, p.Language, p.Status,
        p.HasAcceptedRodo, p.PhotoConsent, p.NetworkingConsent,
        p.DietaryPreferences, p.ShirtSize, p.Wishes,
        p.AirportTransfer, p.ArrivalTime, p.FlightNumber,
        p.TableName, p.RoomNumber, p.GroupName);
}
