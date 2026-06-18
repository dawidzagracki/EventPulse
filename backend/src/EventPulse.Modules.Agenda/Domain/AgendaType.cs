using EventPulse.Shared.Domain;

namespace EventPulse.Modules.Agenda.Domain;

/// <summary>
/// An admin-defined agenda category for a specific event ("sami dodajemy typy agendy").
/// Used alongside the built-in <see cref="AgendaItemType"/> presets — an agenda item
/// references one of these via <see cref="AgendaItem.CustomTypeId"/>.
/// </summary>
public sealed class AgendaType : TenantEntity
{
    public Guid EventId { get; set; }
    public int Order { get; set; }

    public required string NamePl { get; set; }
    public string? NameEn { get; set; }

    /// <summary>Accent colour (hex), shown as the item's category chip.</summary>
    public string Color { get; set; } = "#6366f1";

    /// <summary>Optional emoji / icon shown next to the name.</summary>
    public string? Icon { get; set; }
}
