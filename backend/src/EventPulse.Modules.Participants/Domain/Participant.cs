using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Participants.Domain;

/// <summary>A guest of a specific event. Email is unique per event. Logs in via <see cref="AccessToken"/>.</summary>
public sealed class Participant : TenantEntity
{
    public Guid EventId { get; set; }

    public required string FirstName { get; set; }
    public required string LastName { get; set; }

    /// <summary>Unique per event for primary guests; null for accompanying persons (they have no e-mail).</summary>
    public string? Email { get; set; }

    public string? Phone { get; set; }
    public string? Company { get; set; }
    public string? Position { get; set; }

    /// <summary>Set when this record is an accompanying person (plus-one) added by another participant.</summary>
    public Guid? ParentParticipantId { get; set; }

    /// <summary>Age of an accompanying person (so the agency knows e.g. how many minors attend).</summary>
    public int? Age { get; set; }

    public string Language { get; set; } = "pl";

    public string? GroupName { get; set; }
    public string? TableName { get; set; }
    public string? RoomNumber { get; set; }
    public string? HotelName { get; set; }
    public string? HotelAddress { get; set; }
    public string? HotelPhone { get; set; }

    public bool AirportTransfer { get; set; }
    public string? ArrivalTime { get; set; }
    public string? FlightNumber { get; set; }

    public string? DietaryPreferences { get; set; }
    public string? ShirtSize { get; set; }
    public string? Wishes { get; set; }
    public string? Notes { get; set; }

    // RODO / consents
    public DateTimeOffset? RodoAcceptedAt { get; set; }
    public string? RodoVersion { get; set; }
    public bool PhotoConsent { get; set; }
    public bool NetworkingConsent { get; set; }

    public DateTimeOffset? PreferencesSubmittedAt { get; set; }

    /// <summary>Answers to the event's custom fields, as a JSON object keyed by field id.</summary>
    public string? CustomFieldsJson { get; set; }

    /// <summary>Set once the participant has completed the event's custom onboarding (if any).</summary>
    public DateTimeOffset? OnboardingCompletedAt { get; set; }

    public ParticipantStatus Status { get; set; } = ParticipantStatus.Invited;

    public DateTimeOffset? CheckedInAt { get; set; }
    public DateTimeOffset? CheckedOutAt { get; set; }

    public bool HasAcceptedRodo => RodoAcceptedAt is not null;

    /// <summary>Opaque token embedded in the QR code and the email login link.</summary>
    public Guid AccessToken { get; set; } = Guid.NewGuid();
}
