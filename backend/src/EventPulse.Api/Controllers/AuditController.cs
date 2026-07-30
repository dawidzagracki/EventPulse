using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Identity.Domain;
using EventPulse.Shared.Domain;
using EventPulse.Shared.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Policy = AuthPolicies.Agency)]
public sealed class AuditController : ControllerBase
{
    private readonly IAppDbContext _db;

    public AuditController(IAppDbContext db) => _db = db;

    public sealed record AuditEntryDto(
        Guid Id,
        Guid? UserId,
        string? PrincipalType,
        string? ActorEmail,
        string Action,
        DateTimeOffset CreatedAt,
        string? Payload);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AuditEntryDto>>> List([FromQuery] int take = 100, CancellationToken ct = default)
    {
        var rows = await _db.Set<AuditLog>().AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Take(Math.Clamp(take, 1, 500))
            .Select(a => new { a.Id, a.UserId, a.PrincipalType, a.ActorEmail, a.Action, a.CreatedAt, a.Payload })
            .ToListAsync(ct);

        // Rows written before ActorEmail existed only carry a UserId, so fill those in from the
        // account tables — otherwise the whole existing log keeps showing just a role.
        var unresolved = rows
            .Where(r => string.IsNullOrWhiteSpace(r.ActorEmail) && r.UserId is not null)
            .Select(r => r.UserId!.Value)
            .Distinct()
            .ToList();

        var byId = new Dictionary<Guid, string>();
        if (unresolved.Count > 0)
        {
            foreach (var user in await _db.Set<User>().AsNoTracking()
                .Where(u => unresolved.Contains(u.Id))
                .Select(u => new { u.Id, u.Email })
                .ToListAsync(ct))
            {
                byId[user.Id] = user.Email;
            }

            foreach (var client in await _db.Set<ClientUser>().AsNoTracking()
                .Where(c => unresolved.Contains(c.Id))
                .Select(c => new { c.Id, c.Email })
                .ToListAsync(ct))
            {
                byId.TryAdd(client.Id, client.Email);
            }
        }

        return Ok(rows.Select(r => new AuditEntryDto(
            r.Id,
            r.UserId,
            r.PrincipalType,
            string.IsNullOrWhiteSpace(r.ActorEmail)
                ? (r.UserId is not null && byId.TryGetValue(r.UserId.Value, out var resolved) ? resolved : null)
                : r.ActorEmail,
            r.Action,
            r.CreatedAt,
            r.Payload)).ToList());
    }
}
