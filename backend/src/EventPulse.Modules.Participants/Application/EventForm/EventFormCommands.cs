using System.Text.Json;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.EventForm;

// ---------------------------------------------------------------------------
// Admin: define the custom fields + onboarding for an event.
// ---------------------------------------------------------------------------

/// <summary>Replaces the event's custom-field set, preserving ids of kept fields (so answers stay linked).</summary>
public sealed record SaveCustomFieldsCommand(Guid EventId, IReadOnlyList<CustomFieldInput> Fields)
    : IRequest<IReadOnlyList<CustomFieldDto>>;

public sealed class SaveCustomFieldsHandler : IRequestHandler<SaveCustomFieldsCommand, IReadOnlyList<CustomFieldDto>>
{
    private readonly IAppDbContext _db;

    public SaveCustomFieldsHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<CustomFieldDto>> Handle(SaveCustomFieldsCommand request, CancellationToken cancellationToken)
    {
        var existing = await _db.Set<EventCustomField>()
            .Where(f => f.EventId == request.EventId)
            .ToListAsync(cancellationToken);

        // Delete fields no longer present in the submitted set.
        var keptIds = request.Fields.Where(f => f.Id is not null).Select(f => f.Id!.Value).ToHashSet();
        foreach (var orphan in existing.Where(e => !keptIds.Contains(e.Id)))
        {
            _db.Set<EventCustomField>().Remove(orphan);
        }

        var order = 0;
        foreach (var input in request.Fields)
        {
            var entity = input.Id is Guid id ? existing.FirstOrDefault(e => e.Id == id) : null;
            if (entity is null)
            {
                entity = new EventCustomField { EventId = request.EventId, LabelPl = input.LabelPl.Trim() };
                _db.Set<EventCustomField>().Add(entity);
            }

            entity.LabelPl = input.LabelPl.Trim();
            entity.LabelEn = string.IsNullOrWhiteSpace(input.LabelEn) ? null : input.LabelEn.Trim();
            entity.Type = input.Type;
            entity.Required = input.Required;
            entity.Order = order++;
            var isOptionType = input.Type is CustomFieldType.Select or CustomFieldType.MultiSelect;
            entity.OptionsJson = isOptionType ? JsonSerializer.Serialize(input.Options ?? []) : null;

            // Only MultiSelect carries selection rules; keep just the non-trivial ones (exclusive or a
            // restricted allow-list) so a normal field stores nothing.
            var rules = input.Type == CustomFieldType.MultiSelect && input.OptionRules is { Count: > 0 }
                ? input.OptionRules
                    .Where(kv => kv.Value.Exclusive || (kv.Value.AllowedWith is { Count: > 0 }))
                    .ToDictionary(kv => kv.Key, kv => new { exclusive = kv.Value.Exclusive, allowedWith = kv.Value.AllowedWith ?? [] })
                : null;
            entity.OptionRulesJson = rules is { Count: > 0 }
                ? JsonSerializer.Serialize(rules, CustomFieldDto.Json)
                : null;
        }

        await _db.SaveChangesAsync(cancellationToken);

        var saved = await _db.Set<EventCustomField>().AsNoTracking()
            .Where(f => f.EventId == request.EventId)
            .OrderBy(f => f.Order)
            .ToListAsync(cancellationToken);
        return saved.Select(CustomFieldDto.From).ToList();
    }
}

/// <summary>Replaces the event's onboarding steps (no per-participant linkage, so a full rebuild is fine).</summary>
public sealed record SaveOnboardingCommand(Guid EventId, IReadOnlyList<OnboardingStepInput> Steps)
    : IRequest<IReadOnlyList<OnboardingStepDto>>;

public sealed class SaveOnboardingHandler : IRequestHandler<SaveOnboardingCommand, IReadOnlyList<OnboardingStepDto>>
{
    private readonly IAppDbContext _db;

    public SaveOnboardingHandler(IAppDbContext db) => _db = db;

    public async Task<IReadOnlyList<OnboardingStepDto>> Handle(SaveOnboardingCommand request, CancellationToken cancellationToken)
    {
        var existing = await _db.Set<EventOnboardingStep>()
            .Where(s => s.EventId == request.EventId)
            .ToListAsync(cancellationToken);
        _db.Set<EventOnboardingStep>().RemoveRange(existing);

        var order = 0;
        foreach (var input in request.Steps)
        {
            _db.Set<EventOnboardingStep>().Add(new EventOnboardingStep
            {
                EventId = request.EventId,
                TitlePl = input.TitlePl.Trim(),
                TitleEn = string.IsNullOrWhiteSpace(input.TitleEn) ? null : input.TitleEn.Trim(),
                BodyPl = string.IsNullOrWhiteSpace(input.BodyPl) ? null : input.BodyPl,
                BodyEn = string.IsNullOrWhiteSpace(input.BodyEn) ? null : input.BodyEn,
                RequireConfirm = input.RequireConfirm,
                Order = order++,
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        var saved = await _db.Set<EventOnboardingStep>().AsNoTracking()
            .Where(s => s.EventId == request.EventId)
            .OrderBy(s => s.Order)
            .ToListAsync(cancellationToken);
        return saved.Select(OnboardingStepDto.From).ToList();
    }
}

// ---------------------------------------------------------------------------
// Participant: submit answers + complete onboarding.
// ---------------------------------------------------------------------------

/// <summary>Stores the participant's answers to the event custom fields (validates required ones).</summary>
public sealed record SaveMyCustomFieldsCommand(Guid ParticipantId, Dictionary<Guid, string> Values)
    : IRequest<Unit>;

public sealed class SaveMyCustomFieldsHandler : IRequestHandler<SaveMyCustomFieldsCommand, Unit>
{
    private readonly IAppDbContext _db;

    public SaveMyCustomFieldsHandler(IAppDbContext db) => _db = db;

    public async Task<Unit> Handle(SaveMyCustomFieldsCommand request, CancellationToken cancellationToken)
    {
        var participant = await _db.Set<Participant>()
            .FirstOrDefaultAsync(p => p.Id == request.ParticipantId, cancellationToken)
            ?? throw new NotFoundException("Participant not found.");

        var fields = await _db.Set<EventCustomField>().AsNoTracking()
            .Where(f => f.EventId == participant.EventId)
            .ToListAsync(cancellationToken);

        foreach (var field in fields.Where(f => f.Required))
        {
            var present = request.Values.TryGetValue(field.Id, out var v) && !string.IsNullOrWhiteSpace(v);
            // A multi-select answer is a JSON array; an empty "[]" counts as unfilled.
            var hasValue = present && (field.Type != CustomFieldType.MultiSelect || v!.Trim() is not ("[]" or "[ ]"));
            if (!hasValue)
            {
                throw new ConflictException($"Field '{field.LabelPl}' is required.");
            }
        }

        // Keep only answers for fields that actually belong to this event.
        var allowed = fields.Select(f => f.Id).ToHashSet();
        var clean = request.Values
            .Where(kv => allowed.Contains(kv.Key) && !string.IsNullOrWhiteSpace(kv.Value))
            .ToDictionary(kv => kv.Key.ToString(), kv => kv.Value.Trim());

        participant.CustomFieldsJson = clean.Count > 0 ? JsonSerializer.Serialize(clean) : null;

        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

/// <summary>Marks the participant's onboarding as completed.</summary>
public sealed record CompleteOnboardingCommand(Guid ParticipantId) : IRequest<Unit>;

public sealed class CompleteOnboardingHandler : IRequestHandler<CompleteOnboardingCommand, Unit>
{
    private readonly IAppDbContext _db;

    public CompleteOnboardingHandler(IAppDbContext db) => _db = db;

    public async Task<Unit> Handle(CompleteOnboardingCommand request, CancellationToken cancellationToken)
    {
        var participant = await _db.Set<Participant>()
            .FirstOrDefaultAsync(p => p.Id == request.ParticipantId, cancellationToken)
            ?? throw new NotFoundException("Participant not found.");

        participant.OnboardingCompletedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
