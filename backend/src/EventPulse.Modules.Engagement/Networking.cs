using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Engagement;

public sealed class NetworkingContact : TenantEntity
{
    public Guid OwnerParticipantId { get; set; }
    public Guid ContactParticipantId { get; set; }
    public required string ContactName { get; set; }
    public string? ContactEmail { get; set; }
}

public sealed record ContactDto(string Name, string? Email);

public sealed record AddNetworkingContactCommand(Guid OwnerParticipantId, Guid TargetToken) : IRequest<ContactDto>;

public sealed class AddNetworkingContactHandler(IAppDbContext db) : IRequestHandler<AddNetworkingContactCommand, ContactDto>
{
    public async Task<ContactDto> Handle(AddNetworkingContactCommand request, CancellationToken ct)
    {
        var target = await db.Set<Participant>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.AccessToken == request.TargetToken, ct)
            ?? throw new NotFoundException("Participant not found.");

        if (target.Id == request.OwnerParticipantId)
        {
            throw new ConflictException("Cannot add yourself.");
        }

        if (!target.NetworkingConsent)
        {
            throw new ForbiddenAppException("This participant has not enabled networking.");
        }

        var exists = await db.Set<NetworkingContact>().AnyAsync(
            c => c.OwnerParticipantId == request.OwnerParticipantId && c.ContactParticipantId == target.Id, ct);

        if (!exists)
        {
            db.Set<NetworkingContact>().Add(new NetworkingContact
            {
                OwnerParticipantId = request.OwnerParticipantId,
                ContactParticipantId = target.Id,
                ContactName = $"{target.FirstName} {target.LastName}",
                ContactEmail = target.Email,
            });
            await db.SaveChangesAsync(ct);
        }

        return new ContactDto($"{target.FirstName} {target.LastName}", target.Email);
    }
}

public sealed record ListMyContactsQuery(Guid OwnerParticipantId) : IRequest<IReadOnlyList<ContactDto>>;

public sealed class ListMyContactsHandler(IAppDbContext db) : IRequestHandler<ListMyContactsQuery, IReadOnlyList<ContactDto>>
{
    public async Task<IReadOnlyList<ContactDto>> Handle(ListMyContactsQuery request, CancellationToken ct)
    {
        return await db.Set<NetworkingContact>().AsNoTracking()
            .Where(c => c.OwnerParticipantId == request.OwnerParticipantId)
            .OrderBy(c => c.ContactName)
            .Select(c => new ContactDto(c.ContactName, c.ContactEmail))
            .ToListAsync(ct);
    }
}
