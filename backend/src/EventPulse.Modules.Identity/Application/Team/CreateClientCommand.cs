using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Identity.Domain;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;

namespace EventPulse.Modules.Identity.Application.Team;

/// <summary>A super admin creates a client (mini-admin) account with an initial password.</summary>
public sealed record CreateClientCommand(string Email, string DisplayName, string Password) : IRequest<ClientDto>;

public sealed class CreateClientValidator : AbstractValidator<CreateClientCommand>
{
    public CreateClientValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(100);
    }
}

public sealed class CreateClientHandler : IRequestHandler<CreateClientCommand, ClientDto>
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;

    public CreateClientHandler(IAppDbContext db, IPasswordHasher hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    public async Task<ClientDto> Handle(CreateClientCommand request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        await EmailGuard.EnsureUniqueAsync(_db, email, ct);

        var client = new ClientUser
        {
            // TenantId stamped automatically by the save interceptor.
            Email = email,
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = _hasher.Hash(request.Password),
        };

        _db.Set<ClientUser>().Add(client);
        await _db.SaveChangesAsync(ct);
        return ClientDto.From(client);
    }
}
