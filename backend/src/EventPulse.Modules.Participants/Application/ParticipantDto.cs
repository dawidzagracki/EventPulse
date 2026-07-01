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
    Guid AccessToken)
{
    public static ParticipantDto From(Participant p) => new(
        p.Id, p.EventId, p.FirstName, p.LastName, p.Email, p.Phone, p.Company, p.Position,
        p.Language, p.GroupName, p.TableName, p.RoomNumber, p.AirportTransfer, p.DietaryPreferences, p.Status,
        p.ParentParticipantId, p.Age, p.AccessToken);
}
