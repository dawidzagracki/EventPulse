using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Create;

public sealed class CreateEventHandler : IRequestHandler<CreateEventCommand, EventDto>
{
    private readonly IAppDbContext _db;

    public CreateEventHandler(IAppDbContext db) => _db = db;

    public async Task<EventDto> Handle(CreateEventCommand request, CancellationToken cancellationToken)
    {
        var ev = new Event
        {
            Name = request.Name.Trim(),
            Slug = await UniqueSlugAsync(Slug.From(request.Name), cancellationToken),
            StartsAt = request.StartsAt,
            EndsAt = request.EndsAt,
            Location = request.Location?.Trim(),
            Description = request.Description,
            DefaultLanguage = request.DefaultLanguage ?? "pl",
            ClientEmail = request.ClientEmail?.Trim().ToLowerInvariant(),
            Status = EventStatus.Draft,
        };

        _db.Set<Event>().Add(ev);
        await _db.SaveChangesAsync(cancellationToken);
        return EventDto.From(ev);
    }

    // Slugs are globally unique, so check across all tenants.
    private async Task<string> UniqueSlugAsync(string baseSlug, CancellationToken ct)
    {
        var slug = baseSlug;
        var suffix = 2;
        while (await _db.Set<Event>().IgnoreQueryFilters().AnyAsync(e => e.Slug == slug, ct))
        {
            slug = $"{baseSlug}-{suffix++}";
        }

        return slug;
    }
}
