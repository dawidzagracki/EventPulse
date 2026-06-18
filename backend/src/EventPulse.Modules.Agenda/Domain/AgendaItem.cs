using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Agenda.Domain;

/// <summary>A point in an event's schedule. Bilingual (PL/EN). Raises <see cref="AgendaChanged"/> on edits.</summary>
public sealed class AgendaItem : AggregateRoot
{
    public Guid EventId { get; set; }

    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }

    public required string TitlePl { get; set; }
    public required string TitleEn { get; set; }
    public string? DescriptionPl { get; set; }
    public string? DescriptionEn { get; set; }

    public AgendaItemType Type { get; set; } = AgendaItemType.Talk;

    /// <summary>Optional reference to an admin-defined <see cref="AgendaType"/>; falls back to <see cref="Type"/> when null.</summary>
    public Guid? CustomTypeId { get; set; }

    public string? LocationName { get; set; }
    public string? LocationMapUrl { get; set; }

    public string? SpeakerName { get; set; }
    public string? SpeakerPhone { get; set; }
    public string? SpeakerPhotoUrl { get; set; }

    public string? Menu { get; set; }
    public bool RequiresCheckIn { get; set; }
    public string? DressCode { get; set; }

    /// <summary>If set, the item is only for this group; null means the whole event.</summary>
    public string? GroupName { get; set; }

    public void RaiseChanged(string eventName, AgendaChangeType changeType) =>
        Raise(new AgendaChanged(EventId, eventName, Id, changeType, TitlePl, TitleEn));
}
