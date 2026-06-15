using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Identity.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Identity.Application.Team;

// ---------- Agency user ----------

/// <summary>Edit an agency account: name, role, active flag, and optionally reset the password.</summary>
public sealed record UpdateAgencyUserCommand(Guid Id, string DisplayName, string Role, bool IsActive, string? NewPassword)
    : IRequest<AdminDto>;

public sealed class UpdateAgencyUserValidator : AbstractValidator<UpdateAgencyUserCommand>
{
    public UpdateAgencyUserValidator()
    {
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Role).Must(r => r is "Admin" or "EventStaff").WithMessage("Role must be 'Admin' or 'EventStaff'.");
        RuleFor(x => x.NewPassword!).MinimumLength(8).MaximumLength(100).When(x => !string.IsNullOrEmpty(x.NewPassword));
    }
}

public sealed class UpdateAgencyUserHandler : IRequestHandler<UpdateAgencyUserCommand, AdminDto>
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly ICurrentUser _current;

    public UpdateAgencyUserHandler(IAppDbContext db, IPasswordHasher hasher, ICurrentUser current)
    {
        _db = db;
        _hasher = hasher;
        _current = current;
    }

    public async Task<AdminDto> Handle(UpdateAgencyUserCommand request, CancellationToken ct)
    {
        var user = await _db.Set<User>().FirstOrDefaultAsync(u => u.Id == request.Id, ct)
            ?? throw new NotFoundException("Account not found.");

        var isSelf = _current.UserId == user.Id;
        var newRole = request.Role == "EventStaff" ? UserRole.EventStaff : UserRole.Admin;
        // Guard against locking yourself out: can't demote or deactivate your own account.
        if (isSelf && (newRole != UserRole.Admin || !request.IsActive))
        {
            throw new ConflictException("You cannot change your own role or deactivate your own account.");
        }

        user.DisplayName = request.DisplayName.Trim();
        user.Role = newRole;
        user.IsActive = request.IsActive;
        if (!string.IsNullOrEmpty(request.NewPassword))
        {
            user.PasswordHash = _hasher.Hash(request.NewPassword);
        }

        await _db.SaveChangesAsync(ct);
        return AdminDto.From(user);
    }
}

// ---------- Client user ----------

/// <summary>Edit a client account: name, active flag, and optionally (re)set the password.</summary>
public sealed record UpdateClientCommand(Guid Id, string DisplayName, bool IsActive, string? NewPassword)
    : IRequest<ClientDto>;

public sealed class UpdateClientValidator : AbstractValidator<UpdateClientCommand>
{
    public UpdateClientValidator()
    {
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.NewPassword!).MinimumLength(8).MaximumLength(100).When(x => !string.IsNullOrEmpty(x.NewPassword));
    }
}

public sealed class UpdateClientHandler : IRequestHandler<UpdateClientCommand, ClientDto>
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;

    public UpdateClientHandler(IAppDbContext db, IPasswordHasher hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    public async Task<ClientDto> Handle(UpdateClientCommand request, CancellationToken ct)
    {
        var client = await _db.Set<ClientUser>().FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new NotFoundException("Account not found.");

        client.DisplayName = request.DisplayName.Trim();
        client.IsActive = request.IsActive;
        if (!string.IsNullOrEmpty(request.NewPassword))
        {
            client.PasswordHash = _hasher.Hash(request.NewPassword);
        }

        await _db.SaveChangesAsync(ct);
        return ClientDto.From(client);
    }
}
