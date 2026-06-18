using EventPulse.Modules.Agenda.Domain;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;

namespace EventPulse.Modules.Agenda.Application;

public sealed record CreateAgendaItemCommand(Guid EventId, string EventName, AgendaItemInput Input)
    : IRequest<AgendaItemDto>;

public sealed class CreateAgendaItemValidator : AbstractValidator<CreateAgendaItemCommand>
{
    public CreateAgendaItemValidator() => RuleFor(x => x.Input).SetValidator(new AgendaItemInputValidator());
}

public sealed class CreateAgendaItemHandler : IRequestHandler<CreateAgendaItemCommand, AgendaItemDto>
{
    private readonly IAppDbContext _db;

    public CreateAgendaItemHandler(IAppDbContext db) => _db = db;

    public async Task<AgendaItemDto> Handle(CreateAgendaItemCommand request, CancellationToken cancellationToken)
    {
        var input = request.Input;
        var item = new AgendaItem
        {
            EventId = request.EventId,
            StartsAt = input.StartsAt,
            EndsAt = input.EndsAt,
            TitlePl = input.TitlePl,
            TitleEn = input.TitleEn,
            DescriptionPl = input.DescriptionPl,
            DescriptionEn = input.DescriptionEn,
            Type = input.Type,
            CustomTypeId = input.CustomTypeId,
            LocationName = input.LocationName,
            LocationMapUrl = input.LocationMapUrl,
            SpeakerName = input.SpeakerName,
            SpeakerPhone = input.SpeakerPhone,
            SpeakerPhotoUrl = input.SpeakerPhotoUrl,
            Menu = input.Menu,
            RequiresCheckIn = input.RequiresCheckIn,
            DressCode = input.DressCode,
            GroupName = input.GroupName,
        };

        item.RaiseChanged(request.EventName, AgendaChangeType.Created);
        _db.Set<AgendaItem>().Add(item);
        await _db.SaveChangesAsync(cancellationToken);
        return AgendaItemDto.From(item);
    }
}
