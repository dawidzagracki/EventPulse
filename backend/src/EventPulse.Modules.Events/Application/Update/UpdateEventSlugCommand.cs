using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Update;

/// <summary>
/// Lets an admin choose a friendly URL slug instead of the GUID. Slugs are globally unique
/// (shared public domain), so uniqueness is checked across all tenants.
/// </summary>
public sealed record UpdateEventSlugCommand(Guid Id, string Slug) : IRequest<EventDto>;

public sealed class UpdateEventSlugValidator : AbstractValidator<UpdateEventSlugCommand>
{
    public UpdateEventSlugValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Slug).NotEmpty().MaximumLength(160);
    }
}

public sealed class UpdateEventSlugHandler : IRequestHandler<UpdateEventSlugCommand, EventDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public UpdateEventSlugHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<EventDto> Handle(UpdateEventSlugCommand request, CancellationToken cancellationToken)
    {
        var ev = await _db.Set<Event>()
            .FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        // A Client may only manage their own event.
        if (_currentUser.IsClient)
        {
            var email = _currentUser.Email?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(ev.ClientEmail)
                || !string.Equals(ev.ClientEmail, email, StringComparison.OrdinalIgnoreCase))
            {
                throw new NotFoundException("Event not found.");
            }
        }

        var slug = Slug.From(request.Slug);

        // Globally unique across tenants → check past the tenant filter.
        var taken = await _db.Set<Event>().IgnoreQueryFilters()
            .AnyAsync(e => e.Slug == slug && e.Id != ev.Id, cancellationToken);
        if (taken)
        {
            throw new ConflictException("This address is already taken. Choose another.");
        }

        ev.Slug = slug;
        await _db.SaveChangesAsync(cancellationToken);
        return EventDto.From(ev);
    }
}
