using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Participants.Domain;

/// <summary>Post-event feedback from a participant: a 1–5 star rating and optional comment.</summary>
public sealed class Feedback : TenantEntity
{
    public Guid EventId { get; set; }
    public Guid ParticipantId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTimeOffset SubmittedAt { get; set; }
}
