using System.Text.Json;
using EventPulse.Modules.Participants.Domain;

namespace EventPulse.Modules.Participants.Application.EventForm;

/// <summary>
/// Selection rule for one MultiSelect option. <see cref="Exclusive"/> = can't be combined with anything.
/// A non-empty <see cref="AllowedWith"/> = when this option is picked, only these others may be picked too.
/// </summary>
public sealed record OptionRuleDto(bool Exclusive, IReadOnlyList<string> AllowedWith);

public sealed record CustomFieldDto(
    Guid Id,
    string LabelPl,
    string? LabelEn,
    CustomFieldType Type,
    IReadOnlyList<string> Options,
    IReadOnlyDictionary<string, OptionRuleDto> OptionRules,
    bool Required,
    int Order)
{
    internal static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static CustomFieldDto From(EventCustomField f)
    {
        var raw = ParseOptions(f.OptionsJson);
        // Options are returned as clean labels; the legacy leading "!" (exclusive) is stripped here.
        var options = raw.Select(StripBang).ToList();
        return new(f.Id, f.LabelPl, f.LabelEn, f.Type, options, BuildRules(f.OptionRulesJson, raw), f.Required, f.Order);
    }

    public static IReadOnlyList<string> ParseOptions(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch (JsonException) { return []; }
    }

    private static string StripBang(string s) => s.StartsWith('!') ? s[1..].Trim() : s;

    private sealed record StoredRule(bool? Exclusive, List<string>? AllowedWith);

    /// <summary>Structured rules if present; otherwise derived from the legacy "!" prefix so old data keeps working.</summary>
    private static IReadOnlyDictionary<string, OptionRuleDto> BuildRules(string? rulesJson, IReadOnlyList<string> rawOptions)
    {
        if (!string.IsNullOrWhiteSpace(rulesJson))
        {
            try
            {
                var stored = JsonSerializer.Deserialize<Dictionary<string, StoredRule>>(rulesJson, Json);
                if (stored is not null)
                {
                    return stored.ToDictionary(
                        kv => kv.Key,
                        kv => new OptionRuleDto(kv.Value.Exclusive == true, kv.Value.AllowedWith ?? []));
                }
            }
            catch (JsonException) { /* fall through to legacy */ }
        }

        return rawOptions
            .Where(o => o.StartsWith('!'))
            .ToDictionary(o => StripBang(o), _ => new OptionRuleDto(true, []));
    }
}

public sealed record OptionRuleInput(bool Exclusive, IReadOnlyList<string>? AllowedWith);

public sealed record CustomFieldInput(
    Guid? Id,
    string LabelPl,
    string? LabelEn,
    CustomFieldType Type,
    IReadOnlyList<string>? Options,
    bool Required,
    IReadOnlyDictionary<string, OptionRuleInput>? OptionRules = null);

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
