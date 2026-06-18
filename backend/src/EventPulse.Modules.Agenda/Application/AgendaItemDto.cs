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
    string? GroupName,
    Guid? CustomTypeId,
    string? CustomTypeName,
    string? CustomTypeNameEn,
    string? CustomTypeColor,
    string? CustomTypeIcon)
{
    public static AgendaItemDto From(AgendaItem i) => new(
        i.Id, i.EventId, i.StartsAt, i.EndsAt, i.TitlePl, i.TitleEn, i.DescriptionPl, i.DescriptionEn,
        i.Type, i.LocationName, i.LocationMapUrl, i.SpeakerName, i.SpeakerPhone, i.SpeakerPhotoUrl,
        i.Menu, i.RequiresCheckIn, i.DressCode, i.GroupName,
        i.CustomTypeId, null, null, null, null);

    /// <summary>Maps items and fills the denormalized custom-type fields from the supplied lookup.</summary>
    public static IReadOnlyList<AgendaItemDto> Enrich(
        IEnumerable<AgendaItem> items, IReadOnlyDictionary<Guid, AgendaType> types)
        => items.Select(i =>
        {
            var dto = From(i);
            if (i.CustomTypeId is Guid id && types.TryGetValue(id, out var t))
            {
                return dto with
                {
                    CustomTypeName = t.NamePl,
                    CustomTypeNameEn = t.NameEn,
                    CustomTypeColor = t.Color,
                    CustomTypeIcon = t.Icon,
                };
            }

            return dto;
        }).ToList();
}
