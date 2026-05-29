using EventPulse.Modules.Identity.Auth;
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

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<object>>> List([FromQuery] int take = 100, CancellationToken ct = default)
    {
        var rows = await _db.Set<AuditLog>().AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Take(Math.Clamp(take, 1, 500))
            .Select(a => new { a.Id, a.UserId, a.PrincipalType, a.Action, a.CreatedAt, a.Payload })
            .ToListAsync(ct);

        return Ok(rows);
    }
}
