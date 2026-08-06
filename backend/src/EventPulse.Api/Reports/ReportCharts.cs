using System.Globalization;

namespace EventPulse.Api.Reports;

/// <summary>
/// Chart geometry as inline SVG. Shapes only — every label is drawn by QuestPDF instead, because
/// text inside SVG goes through Skia's own font resolution and Polish diacritics are exactly the
/// kind of thing that silently turns into boxes there.
/// </summary>
public static class ReportCharts
{
    private static string N(double value) => value.ToString("0.##", CultureInfo.InvariantCulture);

    /// <summary>
    /// Attendance as a ring. Starts at twelve o'clock and runs clockwise, so a glance at where the
    /// arc stops reads as a proportion without anyone having to find the number.
    /// </summary>
    public static string Ring(double percent, string track, string fill, double thickness = 16)
    {
        const double size = 200;
        const double centre = size / 2;
        var radius = centre - (thickness / 2);
        var value = Math.Clamp(percent, 0, 100);
        var circumference = 2 * Math.PI * radius;

        // A full circle drawn as an arc collapses to nothing (start point == end point), so the
        // 100% case has to be a plain circle.
        var arc = value >= 99.95
            ? $"<circle cx='{N(centre)}' cy='{N(centre)}' r='{N(radius)}' fill='none' stroke='{fill}' stroke-width='{N(thickness)}' />"
            : $"<circle cx='{N(centre)}' cy='{N(centre)}' r='{N(radius)}' fill='none' stroke='{fill}' "
              + $"stroke-width='{N(thickness)}' stroke-linecap='round' "
              + $"stroke-dasharray='{N(circumference * value / 100)} {N(circumference)}' "
              + $"transform='rotate(-90 {N(centre)} {N(centre)})' />";

        return $"""
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {N(size)} {N(size)}'>
              <circle cx='{N(centre)}' cy='{N(centre)}' r='{N(radius)}' fill='none' stroke='{track}' stroke-width='{N(thickness)}' />
              {arc}
            </svg>
            """;
    }

    /// <summary>
    /// The soft brand wash behind the cover and closing pages. A radial gradient rather than a flat
    /// fill so the page has depth when printed on a single ink.
    /// </summary>
    public static string Wash(string color, double opacity = 0.16)
    {
        return $"""
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 560' preserveAspectRatio='none'>
              <defs>
                <radialGradient id='w' cx='0.82' cy='0.26' r='0.62'>
                  <stop offset='0' stop-color='{color}' stop-opacity='{N(opacity)}' />
                  <stop offset='0.4' stop-color='{color}' stop-opacity='{N(opacity * 0.4)}' />
                  <stop offset='0.75' stop-color='{color}' stop-opacity='{N(opacity * 0.08)}' />
                  <stop offset='1' stop-color='{color}' stop-opacity='0' />
                </radialGradient>
              </defs>
              <rect width='1000' height='560' fill='url(#w)' />
            </svg>
            """;
    }

    /// <summary>
    /// Full-bleed brand panel for the cover and closing pages: a diagonal blend from the primary
    /// colour into a deepened version of itself, so a single-hue page still has movement.
    /// </summary>
    public static string Panel(string from, string to)
    {
        return $"""
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 560' preserveAspectRatio='none'>
              <defs>
                <linearGradient id='p' x1='0' y1='0' x2='1' y2='1'>
                  <stop offset='0' stop-color='{from}' />
                  <stop offset='1' stop-color='{to}' />
                </linearGradient>
                <radialGradient id='g' cx='0.8' cy='0.12' r='0.75'>
                  <stop offset='0' stop-color='#ffffff' stop-opacity='0.3' />
                  <stop offset='1' stop-color='#ffffff' stop-opacity='0' />
                </radialGradient>
              </defs>
              <rect width='1000' height='560' fill='url(#p)' />
              <rect width='1000' height='560' fill='url(#g)' />
            </svg>
            """;
    }

    /// <summary>A rounded, brand-tinted card back. Cheaper than a border and reads as a surface.</summary>
    public static string CardBack(string fill, string edge)
    {
        return $"""
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200' preserveAspectRatio='none'>
              <rect x='1' y='1' width='298' height='198' rx='14' fill='{fill}' />
              <rect x='1' y='1' width='7' height='198' rx='3.5' fill='{edge}' />
            </svg>
            """;
    }

    /// <summary>
    /// The arrival curve: one bar per quarter of an hour, drawn as a single SVG so the bars keep
    /// their proportions no matter how many slots the day produced.
    /// </summary>
    public static string Columns(IReadOnlyList<int> values, string fill, string peakFill)
    {
        if (values.Count == 0)
        {
            return Wash(fill, 0);
        }

        const double width = 1000;
        const double height = 260;
        var max = Math.Max(values.Max(), 1);
        var slot = width / values.Count;
        // Thin bars with a real gap read as a histogram; touching bars read as an area chart and
        // hide where one quarter of an hour ends and the next begins.
        var barWidth = Math.Max(Math.Min(slot * 0.62, 34), 2);

        var bars = values.Select((value, index) =>
        {
            var barHeight = value == 0 ? 0 : Math.Max(height * value / max, 3);
            var x = (index * slot) + ((slot - barWidth) / 2);
            var radius = Math.Min(barWidth / 2, 4);
            return $"<rect x='{N(x)}' y='{N(height - barHeight)}' width='{N(barWidth)}' height='{N(barHeight)}' "
                   + $"rx='{N(radius)}' fill='{(value == max ? peakFill : fill)}' />";
        });

        return $"""
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {N(width)} {N(height)}' preserveAspectRatio='none'>
              {string.Join("\n  ", bars)}
            </svg>
            """;
    }
}
