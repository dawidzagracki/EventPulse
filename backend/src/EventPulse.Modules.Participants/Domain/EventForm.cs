using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Participants.Domain;

/// <summary>Input type of a custom participant field (the "custom tiles" an admin defines per event).</summary>
public enum CustomFieldType
{
    Text = 0,
    Textarea = 1,
    Checkbox = 2,
    Select = 3,
    /// <summary>Multiple choice — answer stored as a JSON array of the chosen option strings.</summary>
    MultiSelect = 4,
}

/// <summary>
/// An admin-defined custom field collected from participants ("customowe kafelki").
/// Definitions live here; the participant's answers are stored on
/// <see cref="Participant.CustomFieldsJson"/> keyed by this field's id.
/// </summary>
public sealed class EventCustomField : TenantEntity
{
    public Guid EventId { get; set; }
    public int Order { get; set; }

    public required string LabelPl { get; set; }
    public string? LabelEn { get; set; }

    public CustomFieldType Type { get; set; } = CustomFieldType.Text;

    /// <summary>JSON array of option strings (used when <see cref="Type"/> is <see cref="CustomFieldType.Select"/>).</summary>
    public string? OptionsJson { get; set; }

    /// <summary>
    /// Optional per-option selection rules for MultiSelect, as a JSON object keyed by option label:
    /// <c>{ "Label": { "exclusive": true } | { "allowedWith": ["B","C"] } }</c>. An "exclusive" option
    /// can't be combined with any other; an "allowedWith" option restricts which others may be picked
    /// alongside it (a "selection path"). Null = no restrictions (legacy "!"-prefix still honoured).
    /// </summary>
    public string? OptionRulesJson { get; set; }

    public bool Required { get; set; }
}

/// <summary>
/// An admin-defined onboarding step shown to the participant before they enter the app
/// ("customowy onboarding — tak jak agenda przed logowaniem").
/// </summary>
public sealed class EventOnboardingStep : TenantEntity
{
    public Guid EventId { get; set; }
    public int Order { get; set; }

    public required string TitlePl { get; set; }
    public string? TitleEn { get; set; }

    public string? BodyPl { get; set; }
    public string? BodyEn { get; set; }

    /// <summary>When true the participant must tick a confirmation box to continue.</summary>
    public bool RequireConfirm { get; set; }
}
