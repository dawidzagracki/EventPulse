using EventPulse.Shared.Application;
using EventPulse.Shared.Domain;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Logistics;

public sealed class Transfer : TenantEntity
{
    public Guid EventId { get; set; }
    public required string Name { get; set; }
    public DateTimeOffset DepartureTime { get; set; }
    public required string MeetingPoint { get; set; }
    public string? Note { get; set; }
}

public sealed record TransferDto(Guid Id, Guid EventId, string Name, DateTimeOffset DepartureTime, string MeetingPoint, string? Note)
{
    public static TransferDto From(Transfer t) => new(t.Id, t.EventId, t.Name, t.DepartureTime, t.MeetingPoint, t.Note);
}

public sealed record ListTransfersQuery(Guid EventId) : IRequest<IReadOnlyList<TransferDto>>;

public sealed class ListTransfersHandler(IAppDbContext db) : IRequestHandler<ListTransfersQuery, IReadOnlyList<TransferDto>>
{
    public async Task<IReadOnlyList<TransferDto>> Handle(ListTransfersQuery request, CancellationToken ct)
    {
        var items = await db.Set<Transfer>().AsNoTracking()
            .Where(t => t.EventId == request.EventId)
            .OrderBy(t => t.DepartureTime)
            .ToListAsync(ct);
        return items.Select(TransferDto.From).ToList();
    }
}

public sealed record CreateTransferCommand(Guid EventId, string Name, DateTimeOffset DepartureTime, string MeetingPoint, string? Note)
    : IRequest<TransferDto>;

public sealed class CreateTransferValidator : AbstractValidator<CreateTransferCommand>
{
    public CreateTransferValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.MeetingPoint).NotEmpty().MaximumLength(300);
    }
}

public sealed class CreateTransferHandler(IAppDbContext db) : IRequestHandler<CreateTransferCommand, TransferDto>
{
    public async Task<TransferDto> Handle(CreateTransferCommand request, CancellationToken ct)
    {
        var transfer = new Transfer
        {
            EventId = request.EventId,
            Name = request.Name.Trim(),
            DepartureTime = request.DepartureTime,
            MeetingPoint = request.MeetingPoint.Trim(),
            Note = request.Note,
        };
        db.Set<Transfer>().Add(transfer);
        await db.SaveChangesAsync(ct);
        return TransferDto.From(transfer);
    }
}

public sealed record DeleteTransferCommand(Guid Id) : IRequest;

public sealed class DeleteTransferHandler(IAppDbContext db) : IRequestHandler<DeleteTransferCommand>
{
    public async Task Handle(DeleteTransferCommand request, CancellationToken ct)
    {
        var transfer = await db.Set<Transfer>().FirstOrDefaultAsync(t => t.Id == request.Id, ct)
            ?? throw new NotFoundException("Transfer not found.");
        db.Set<Transfer>().Remove(transfer);
        await db.SaveChangesAsync(ct);
    }
}
