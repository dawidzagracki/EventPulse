using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.EventForm;

public sealed record ListCustomFieldsQuery(Guid EventId) : IRequest<IReadOnlyList<CustomFieldDto>>;

public sealed class ListCustomFieldsHandler : IRequestHandler<ListCustomFieldsQuery, IReadOnlyList<CustomFieldDto>>
{
    private readonly IAppDbContext _db;

    public ListCustomFieldsHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<CustomFieldDto>> Handle(ListCustomFieldsQuery request, CancellationToken cancellationToken)
    {
        var fields = await _db.Set<EventCustomField>().AsNoTracking()
            .Where(f => f.EventId == request.EventId)
            .OrderBy(f => f.Order)
            .ToListAsync(cancellationToken);

        return fields.Select(CustomFieldDto.From).ToList();
    }
}

public sealed record ListOnboardingQuery(Guid EventId) : IRequest<IReadOnlyList<OnboardingStepDto>>;

public sealed class ListOnboardingHandler : IRequestHandler<ListOnboardingQuery, IReadOnlyList<OnboardingStepDto>>
{
    private readonly IAppDbContext _db;

    public ListOnboardingHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<OnboardingStepDto>> Handle(ListOnboardingQuery request, CancellationToken cancellationToken)
    {
        var steps = await _db.Set<EventOnboardingStep>().AsNoTracking()
            .Where(s => s.EventId == request.EventId)
            .OrderBy(s => s.Order)
            .ToListAsync(cancellationToken);

        return steps.Select(OnboardingStepDto.From).ToList();
    }
}
