using System.Globalization;
using System.Text;

namespace EventPulse.Modules.Events.Application;

/// <summary>Turns an event name into a URL-safe slug, transliterating Polish diacritics.</summary>
public static class Slug
{
    private static readonly Dictionary<char, char> PolishMap = new()
    {
        ['ą'] = 'a', ['ć'] = 'c', ['ę'] = 'e', ['ł'] = 'l', ['ń'] = 'n',
        ['ó'] = 'o', ['ś'] = 's', ['ż'] = 'z', ['ź'] = 'z',
    };

    public static string From(string input)
    {
        var lower = input.Trim().ToLowerInvariant();
        var sb = new StringBuilder(lower.Length);

        foreach (var ch in lower)
        {
            if (PolishMap.TryGetValue(ch, out var mapped))
            {
                sb.Append(mapped);
            }
            else if (char.IsLetterOrDigit(ch) && ch < 128)
            {
                sb.Append(ch);
            }
            else if (char.GetUnicodeCategory(ch) is UnicodeCategory.SpaceSeparator
                     || ch is '-' or '_' or '.' or '/')
            {
                sb.Append('-');
            }
            // other characters dropped
        }

        var slug = sb.ToString();
        while (slug.Contains("--"))
        {
            slug = slug.Replace("--", "-");
        }

        slug = slug.Trim('-');
        return string.IsNullOrEmpty(slug) ? "event" : slug;
    }
}
