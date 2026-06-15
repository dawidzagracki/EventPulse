using EventPulse.Modules.Identity.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Identity.Application.Team;

/// <summary>Lists agency staff in the caller's tenant (global query filter scopes by tenant).</summary>
public sealed record ListAdminsQuery : IRequest<IReadOnlyList<AdminDto>>;

public sealed class ListAdminsHandler : IRequestHandler<ListAdminsQuery, IReadOnlyList<AdminDto>>
{
    private readonly IAppDbContext _db;
    public ListAdminsHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<AdminDto>> Handle(ListAdminsQuery request, CancellationToken ct)
    {
        var users = await _db.Set<User>().AsNoTracking().OrderBy(u => u.CreatedAt).ToListAsync(ct);
        return users.Select(AdminDto.From).ToList();
    }
}

/// <summary>Lists client accounts in the caller's tenant.</summary>
public sealed record ListClientsQuery : IRequest<IReadOnlyList<ClientDto>>;

public sealed class ListClientsHandler : IRequestHandler<ListClientsQuery, IReadOnlyList<ClientDto>>
{
    private readonly IAppDbContext _db;
    public ListClientsHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<ClientDto>> Handle(ListClientsQuery request, CancellationToken ct)
    {
        var clients = await _db.Set<ClientUser>().AsNoTracking().OrderBy(c => c.CreatedAt).ToListAsync(ct);
        return clients.Select(ClientDto.From).ToList();
    }
}
