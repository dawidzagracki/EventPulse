using EventPulse.Modules.Agenda.Domain;
using FluentValidation;

namespace EventPulse.Modules.Agenda.Application;

public sealed record AgendaItemInput(
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
    string? GroupName);

public sealed class AgendaItemInputValidator : AbstractValidator<AgendaItemInput>
{
    public AgendaItemInputValidator()
    {
        RuleFor(x => x.TitlePl).NotEmpty().MaximumLength(300);
        RuleFor(x => x.TitleEn).NotEmpty().MaximumLength(300);
        RuleFor(x => x.EndsAt).GreaterThanOrEqualTo(x => x.StartsAt);
        RuleFor(x => x.LocationName).MaximumLength(300);
        RuleFor(x => x.SpeakerName).MaximumLength(200);
        RuleFor(x => x.GroupName).MaximumLength(200);
    }
}
