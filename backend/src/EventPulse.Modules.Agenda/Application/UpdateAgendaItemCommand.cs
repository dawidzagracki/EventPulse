using EventPulse.Modules.Agenda.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Agenda.Application;

public sealed record UpdateAgendaItemCommand(Guid Id, string EventName, AgendaItemInput Input)
    : IRequest<AgendaItemDto>;

public sealed class UpdateAgendaItemValidator : AbstractValidator<UpdateAgendaItemCommand>
{
    public UpdateAgendaItemValidator() => RuleFor(x => x.Input).SetValidator(new AgendaItemInputValidator());
}

public sealed class UpdateAgendaItemHandler : IRequestHandler<UpdateAgendaItemCommand, AgendaItemDto>
{
    private readonly IAppDbContext _db;

    public UpdateAgendaItemHandler(IAppDbContext db) => _db = db;

    public async Task<AgendaItemDto> Handle(UpdateAgendaItemCommand request, CancellationToken cancellationToken)
    {
        var item = await _db.Set<AgendaItem>()
            .FirstOrDefaultAsync(i => i.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Agenda item not found.");

        var input = request.Input;
        item.StartsAt = input.StartsAt;
        item.EndsAt = input.EndsAt;
        item.TitlePl = input.TitlePl;
        item.TitleEn = input.TitleEn;
        item.DescriptionPl = input.DescriptionPl;
        item.DescriptionEn = input.DescriptionEn;
        item.Type = input.Type;
        item.LocationName = input.LocationName;
        item.LocationMapUrl = input.LocationMapUrl;
        item.SpeakerName = input.SpeakerName;
        item.SpeakerPhone = input.SpeakerPhone;
        item.SpeakerPhotoUrl = input.SpeakerPhotoUrl;
        item.Menu = input.Menu;
        item.RequiresCheckIn = input.RequiresCheckIn;
        item.DressCode = input.DressCode;
        item.GroupName = input.GroupName;

        item.RaiseChanged(request.EventName, AgendaChangeType.Updated);
        await _db.SaveChangesAsync(cancellationToken);
        return AgendaItemDto.From(item);
    }
}
