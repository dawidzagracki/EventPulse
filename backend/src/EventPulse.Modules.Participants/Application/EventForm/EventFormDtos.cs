using System.Text.Json;
using EventPulse.Modules.Participants.Domain;

namespace EventPulse.Modules.Participants.Application.EventForm;

public sealed record CustomFieldDto(
    Guid Id,
    string LabelPl,
    string? LabelEn,
    CustomFieldType Type,
    IReadOnlyList<string> Options,
    bool Required,
    int Order)
{
    public static CustomFieldDto From(EventCustomField f) => new(
        f.Id, f.LabelPl, f.LabelEn, f.Type, ParseOptions(f.OptionsJson), f.Required, f.Order);

    public static IReadOnlyList<string> ParseOptions(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}

public sealed record CustomFieldInput(
    Guid? Id,
    string LabelPl,
    string? LabelEn,
    CustomFieldType Type,
    IReadOnlyList<string>? Options,
    bool Required);

public sealed record OnboardingStepDto(
    Guid Id,
    string TitlePl,
    string? TitleEn,
    string? BodyPl,
    string? BodyEn,
    bool RequireConfirm,
    int Order)
{
    public static OnboardingStepDto From(EventOnboardingStep s) => new(
        s.Id, s.TitlePl, s.TitleEn, s.BodyPl, s.BodyEn, s.RequireConfirm, s.Order);
}

public sealed record OnboardingStepInput(
    string TitlePl,
    string? TitleEn,
    string? BodyPl,
    string? BodyEn,
    bool RequireConfirm);
