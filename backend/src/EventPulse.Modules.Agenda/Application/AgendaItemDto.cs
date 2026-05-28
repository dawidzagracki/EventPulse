using EventPulse.Modules.Agenda.Domain;

namespace EventPulse.Modules.Agenda.Application;

public sealed record AgendaItemDto(
    Guid Id,
    Guid EventId,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string TitlePl,
    string TitleEn,
    string? DescriptionPl,
    string? DescriptionEn,
    AgendaItemType Type,
    string? LocationName,
    string? LocationMapUrl,
    string? SpeakerName,
    string? SpeakerPhone,
    string? SpeakerPhotoUrl,
    string? Menu,
    bool RequiresCheckIn,
    string? DressCode,
    string? GroupName)
{
    public static AgendaItemDto From(AgendaItem i) => new(
        i.Id, i.EventId, i.StartsAt, i.EndsAt, i.TitlePl, i.TitleEn, i.DescriptionPl, i.DescriptionEn,
        i.Type, i.LocationName, i.LocationMapUrl, i.SpeakerName, i.SpeakerPhone, i.SpeakerPhotoUrl,
        i.Menu, i.RequiresCheckIn, i.DressCode, i.GroupName);
}
