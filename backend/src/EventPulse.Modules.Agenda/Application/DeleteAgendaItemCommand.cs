using EventPulse.Modules.Agenda.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Agenda.Application;

public sealed record DeleteAgendaItemCommand(Guid Id, string EventName) : IRequest;

public sealed class DeleteAgendaItemHandler : IRequestHandler<DeleteAgendaItemCommand>
{
    private readonly IAppDbContext _db;

    public DeleteAgendaItemHandler(IAppDbContext db) => _db = db;

    public async Task Handle(DeleteAgendaItemCommand request, CancellationToken cancellationToken)
    {
        var item = await _db.Set<AgendaItem>()
            .FirstOrDefaultAsync(i => i.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Agenda item not found.");

        item.RaiseChanged(request.EventName, AgendaChangeType.Removed); // captured before removal
        _db.Set<AgendaItem>().Remove(item);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
