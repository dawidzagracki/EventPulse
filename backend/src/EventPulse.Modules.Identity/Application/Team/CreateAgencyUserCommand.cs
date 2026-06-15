using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Identity.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Identity.Application.Team;

/// <summary>A super admin invites another agency account (super admin or on-site staff).</summary>
public sealed record CreateAgencyUserCommand(string Email, string DisplayName, string Password, string Role)
    : IRequest<AdminDto>;

public sealed class CreateAgencyUserValidator : AbstractValidator<CreateAgencyUserCommand>
{
    public CreateAgencyUserValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(100);
        RuleFor(x => x.Role).Must(r => r is "Admin" or "EventStaff")
            .WithMessage("Role must be 'Admin' or 'EventStaff'.");
    }
}

public sealed class CreateAgencyUserHandler : IRequestHandler<CreateAgencyUserCommand, AdminDto>
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;

    public CreateAgencyUserHandler(IAppDbContext db, IPasswordHasher hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    public async Task<AdminDto> Handle(CreateAgencyUserCommand request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        await EmailGuard.EnsureUniqueAsync(_db, email, ct);

        var user = new User
        {
            // TenantId is stamped automatically by the save interceptor (creator's tenant).
            Email = email,
            PasswordHash = _hasher.Hash(request.Password),
            DisplayName = request.DisplayName.Trim(),
            Role = request.Role == "EventStaff" ? UserRole.EventStaff : UserRole.Admin,
        };

        _db.Set<User>().Add(user);
        await _db.SaveChangesAsync(ct);
        return AdminDto.From(user);
    }
}

/// <summary>Email is the login key and is matched across both account tables, so it must be globally unique.</summary>
internal static class EmailGuard
{
    public static async Task EnsureUniqueAsync(IAppDbContext db, string email, CancellationToken ct)
    {
        var takenByUser = await db.Set<User>().IgnoreQueryFilters().AnyAsync(u => u.Email == email, ct);
        var takenByClient = await db.Set<ClientUser>().IgnoreQueryFilters().AnyAsync(c => c.Email == email, ct);
        if (takenByUser || takenByClient)
        {
            throw new ConflictException($"An account with e-mail '{email}' already exists.");
        }
    }
}
