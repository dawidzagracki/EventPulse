using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Me;

/// <summary>An accompanying person (plus-one) added by a participant. Has its own QR (AccessToken).</summary>
public sealed record CompanionDto(Guid Id, string FirstName, string LastName, int? Age)
{
    public static CompanionDto From(Participant p) => new(p.Id, p.FirstName, p.LastName, p.Age);
}

public sealed record ListMyCompanionsQuery(Guid ParticipantId) : IRequest<IReadOnlyList<CompanionDto>>;

public sealed class ListMyCompanionsHandler(IAppDbContext db) : IRequestHandler<ListMyCompanionsQuery, IReadOnlyList<CompanionDto>>
{
    public async Task<IReadOnlyList<CompanionDto>> Handle(ListMyCompanionsQuery request, CancellationToken ct)
    {
        var companions = await db.Set<Participant>().AsNoTracking()
            .Where(p => p.ParentParticipantId == request.ParticipantId)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync(ct);
        return companions.Select(CompanionDto.From).ToList();
    }
}

public sealed record AddCompanionCommand(Guid ParticipantId, string FirstName, string LastName, int? Age, int MaxCompanions)
    : IRequest<CompanionDto>;

public sealed class AddCompanionValidator : AbstractValidator<AddCompanionCommand>
{
    public AddCompanionValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Age).InclusiveBetween(0, 120).When(x => x.Age is not null);
    }
}

public sealed class AddCompanionHandler(IAppDbContext db) : IRequestHandler<AddCompanionCommand, CompanionDto>
{
    public async Task<CompanionDto> Handle(AddCompanionCommand request, CancellationToken ct)
    {
        var parent = await db.Set<Participant>()
            .FirstOrDefaultAsync(p => p.Id == request.ParticipantId, ct)
            ?? throw new NotFoundException("Participant not found.");

        // Companions can't add their own companions.
        if (parent.ParentParticipantId is not null)
        {
            throw new ConflictException("Accompanying persons cannot add their own companions.");
        }

        var count = await db.Set<Participant>().CountAsync(p => p.ParentParticipantId == parent.Id, ct);
        if (request.MaxCompanions > 0 && count >= request.MaxCompanions)
        {
            throw new ConflictException($"You can add at most {request.MaxCompanions} accompanying persons.");
        }

        var companion = new Participant
        {
            EventId = parent.EventId,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = null,
            ParentParticipantId = parent.Id,
            Age = request.Age,
            Language = parent.Language,
            Status = ParticipantStatus.Confirmed,
        };
        db.Set<Participant>().Add(companion);
        await db.SaveChangesAsync(ct);

        return CompanionDto.From(companion);
    }
}

public sealed record DeleteCompanionCommand(Guid ParticipantId, Guid CompanionId) : IRequest<Unit>;

public sealed class DeleteCompanionHandler(IAppDbContext db) : IRequestHandler<DeleteCompanionCommand, Unit>
{
    public async Task<Unit> Handle(DeleteCompanionCommand request, CancellationToken ct)
    {
        var companion = await db.Set<Participant>()
            .FirstOrDefaultAsync(p => p.Id == request.CompanionId && p.ParentParticipantId == request.ParticipantId, ct)
            ?? throw new NotFoundException("Companion not found.");

        db.Set<Participant>().Remove(companion);
        await db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}
