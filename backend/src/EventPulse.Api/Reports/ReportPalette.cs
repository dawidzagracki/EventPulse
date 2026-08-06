using System.Globalization;

namespace EventPulse.Api.Reports;

/// <summary>
/// The report is printed in the event's own colours, so every shade it needs has to be derived from
/// three hex values an organiser picked in the page builder — including ones they never chose, like
/// the tint behind a card or the text colour that stays readable on a filled panel.
/// </summary>
public sealed class ReportPalette
{
    public string Primary { get; }
    public string Secondary { get; }
    public string Accent { get; }

    /// <summary>Near-black carrying a hint of the brand hue — flat black looks cheap next to colour.</summary>
    public string Ink { get; }

    public string Muted { get; } = "#6b7280";
    public string Hairline { get; } = "#e7e5e4";
    public string Paper { get; } = "#ffffff";

    /// <summary>Barely-there brand wash for page and card backgrounds.</summary>
    public string Wash { get; }

    /// <summary>Stronger tint for chart fills that still must not compete with the text.</summary>
    public string Tint { get; }

    /// <summary>Text colour that stays legible on a Primary-filled panel.</summary>
    public string OnPrimary { get; }

    /// <summary>Deepened primary — the far end of the cover gradient and the fill of dark panels.</summary>
    public string Deep { get; }

    /// <summary>Readable-on-dark version of the brand colour, for figures printed on Deep.</summary>
    public string OnDeep { get; }

    /// <summary>
    /// A colour safe to set type in on white paper. Brand palettes routinely include a near-white
    /// accent — Kermi's is #e2e8f0 — which is perfectly good as a border and invisible as a number,
    /// so anything too pale is darkened until it reads while keeping its hue.
    /// </summary>
    public string Readable(string color) =>
        Luminance(color) > 0.7 ? Mix(color, Ink, 0.55) : color;

    public ReportPalette(string? primary, string? secondary, string? accent)
    {
        Primary = Normalize(primary, "#4f46e5");
        Secondary = Normalize(secondary, "#0ea5e9");
        Accent = Normalize(accent, "#f59e0b");

        Ink = Mix(Primary, "#0b0a0f", 0.88);
        Wash = Mix(Primary, "#ffffff", 0.955);
        Tint = Mix(Primary, "#ffffff", 0.78);
        OnPrimary = Luminance(Primary) > 0.55 ? Ink : "#ffffff";
        Deep = Mix(Primary, "#141018", 0.55);
        // A bright brand colour keeps its identity on a dark panel; a dark one would vanish into it,
        // so it is lifted toward white until it reads.
        OnDeep = Luminance(Primary) > 0.42 ? Primary : Mix(Primary, "#ffffff", 0.55);
    }

    /// <summary>Blends toward <paramref name="towards"/>; 0 keeps the colour, 1 replaces it.</summary>
    public static string Mix(string color, string towards, double amount)
    {
        var (r1, g1, b1) = Rgb(color);
        var (r2, g2, b2) = Rgb(towards);
        var t = Math.Clamp(amount, 0, 1);
        return $"#{Lerp(r1, r2, t):x2}{Lerp(g1, g2, t):x2}{Lerp(b1, b2, t):x2}";
    }

    /// <summary>A readable spread of related colours for multi-series charts.</summary>
    public IReadOnlyList<string> Series(int count)
    {
        var anchors = new[] { Primary, Secondary, Accent, Mix(Primary, "#000000", 0.3), Mix(Secondary, "#ffffff", 0.35) };
        return Enumerable.Range(0, Math.Max(count, 1))
            .Select(i => anchors[i % anchors.Length])
            .ToList();
    }

    /// <summary>
    /// Perceived brightness (ITU-R BT.601). Good enough to decide black-or-white text, and it does
    /// not need the full sRGB linearisation that WCAG contrast would.
    /// </summary>
    private static double Luminance(string color)
    {
        var (r, g, b) = Rgb(color);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
    }

    private static int Lerp(int from, int to, double t) => (int)Math.Round(from + ((to - from) * t));

    private static (int R, int G, int B) Rgb(string color)
    {
        var hex = color.TrimStart('#');
        if (hex.Length == 3)
        {
            hex = string.Concat(hex.Select(c => new string(c, 2)));
        }

        return (
            int.Parse(hex[..2], NumberStyles.HexNumber, CultureInfo.InvariantCulture),
            int.Parse(hex.Substring(2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture),
            int.Parse(hex.Substring(4, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture));
    }

    /// <summary>
    /// Colours come from user input, so anything unparseable falls back instead of throwing — a
    /// malformed hex must not be the reason a client never gets their report.
    /// </summary>
    private static string Normalize(string? color, string fallback)
    {
        if (string.IsNullOrWhiteSpace(color))
        {
            return fallback;
        }

        var hex = color.Trim().TrimStart('#');
        if ((hex.Length != 3 && hex.Length != 6) || !hex.All(Uri.IsHexDigit))
        {
            return fallback;
        }

        if (hex.Length == 3)
        {
            hex = string.Concat(hex.Select(c => new string(c, 2)));
        }

        return $"#{hex.ToLowerInvariant()}";
    }
}
