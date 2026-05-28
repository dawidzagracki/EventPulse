using System.Text.Json.Nodes;

namespace EventPulse.Modules.Content.Domain;

/// <summary>Starter page layouts so clients don't begin from a blank page.</summary>
public static class PageTemplates
{
    public static readonly IReadOnlyDictionary<string, string[]> Layouts = new Dictionary<string, string[]>
    {
        ["blank"] = ["hero"],
        ["gala"] = ["hero", "description", "agenda", "team", "gallery", "map", "faq"],
        ["konferencja"] = ["hero", "description", "countdown", "agenda", "sponsors", "map", "contact"],
        ["integracja"] = ["hero", "description", "agenda", "team", "gallery"],
        ["premiera"] = ["hero", "description", "countdown", "gallery", "sponsors", "cta"],
    };

    public static bool Exists(string key) => Layouts.ContainsKey(key.ToLowerInvariant());

    public static string Build(string key)
    {
        var layout = Layouts[key.ToLowerInvariant()];

        var blocks = new JsonArray();
        var order = 0;
        foreach (var type in layout)
        {
            blocks.Add(new JsonObject
            {
                ["id"] = Guid.CreateVersion7().ToString(),
                ["type"] = type,
                ["order"] = order++,
                ["visible"] = true,
                ["settings"] = new JsonObject(),
                ["content"] = new JsonObject
                {
                    ["pl"] = new JsonObject { ["title"] = DefaultTitlePl(type) },
                    ["en"] = new JsonObject { ["title"] = DefaultTitleEn(type) },
                },
                ["styles"] = new JsonObject(),
            });
        }

        return new JsonObject { ["blocks"] = blocks }.ToJsonString();
    }

    private static string DefaultTitlePl(string type) => type switch
    {
        "hero" => "Nazwa wydarzenia",
        "description" => "O wydarzeniu",
        "agenda" => "Agenda",
        "team" => "Zespół",
        "gallery" => "Galeria",
        "map" => "Lokalizacja",
        "faq" => "Najczęstsze pytania",
        "countdown" => "Do startu zostało",
        "sponsors" => "Partnerzy",
        "contact" => "Kontakt",
        "cta" => "Dołącz",
        _ => "Sekcja",
    };

    private static string DefaultTitleEn(string type) => type switch
    {
        "hero" => "Event name",
        "description" => "About the event",
        "agenda" => "Agenda",
        "team" => "Team",
        "gallery" => "Gallery",
        "map" => "Location",
        "faq" => "FAQ",
        "countdown" => "Countdown",
        "sponsors" => "Partners",
        "contact" => "Contact",
        "cta" => "Join",
        _ => "Section",
    };
}
