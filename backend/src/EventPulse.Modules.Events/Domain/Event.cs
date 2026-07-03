using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Events.Domain;

/// <summary>
/// The root aggregate of the system. Almost every other entity references an event via EventId.
/// Tenant-scoped: an event always belongs to exactly one agency (tenant).
/// </summary>
public sealed class Event : AggregateRoot
{
    public required string Name { get; set; }

    /// <summary>URL slug, globally unique across all tenants (shared public domain).</summary>
    public required string Slug { get; set; }

    public EventStatus Status { get; set; } = EventStatus.Draft;

    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }

    public string? Location { get; set; }
    public string? Description { get; set; }

    /// <summary>Default UI language for the event: "pl" or "en".</summary>
    public string DefaultLanguage { get; set; } = "pl";

    /// <summary>Email of the end client (mini-admin) who edits this event.</summary>
    public string? ClientEmail { get; set; }

    // ---------------------------------------------------------------------
    // Per-event settings (configured from the dashboard "Ustawienia" tab).
    // ---------------------------------------------------------------------

    /// <summary>
    /// Whether this event collects/uses location (station-scan) data.
    /// Drives the participant reassurance notice ("data not used after the event").
    /// </summary>
    public bool UsesLocationData { get; set; } = true;

    /// <summary>Whether the participant phone number is required (asked during the RODO/consent step).</summary>
    public bool PhoneRequired { get; set; }

    /// <summary>Whether participants may add accompanying persons (plus-ones) from their app.</summary>
    public bool AllowCompanions { get; set; }

    /// <summary>Max accompanying persons per participant. 0 = unlimited (when <see cref="AllowCompanions"/> is on).</summary>
    public int MaxCompanions { get; set; }

    /// <summary>Opt-in automatic anonymization of personal data after the event ends.</summary>
    public bool AnonymizeEnabled { get; set; }

    /// <summary>Days after <see cref="EndsAt"/> before personal data is anonymized.</summary>
    public int AnonymizeAfterDays { get; set; } = 90;

    /// <summary>Set once anonymization has run for this event (idempotency guard).</summary>
    public DateTimeOffset? AnonymizedAt { get; set; }

    /// <summary>Optional external link to event photos shown in the participant app.</summary>
    public string? CustomPhotosUrl { get; set; }

    /// <summary>Optional free-text info shown in the participant app's photos section.</summary>
    public string? CustomPhotosText { get; set; }

    // ---------------------------------------------------------------------
    // Participant-app tiles — let the organiser hide tabs they don't use
    // (e.g. an event with no quizzes can hide "Aktywności"). QR + Profile
    // are always shown, so they have no flag.
    // ---------------------------------------------------------------------

    /// <summary>Show the Agenda tab in the participant app.</summary>
    public bool ShowAgendaTab { get; set; } = true;

    /// <summary>Show the Activities (quizzes/networking/feedback) tab in the participant app.</summary>
    public bool ShowActivitiesTab { get; set; } = true;

    /// <summary>Show the Gallery tab in the participant app.</summary>
    public bool ShowGalleryTab { get; set; } = true;

    /// <summary>Show the Preferences tile (language/diet/shirt/transfer) in the participant profile tab.</summary>
    public bool ShowPreferencesTile { get; set; } = true;
}
