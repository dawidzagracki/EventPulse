using System.Text.RegularExpressions;

namespace EventPulse.Modules.Content.Domain;

/// <summary>
/// Strips script/exfiltration vectors from client-authored custom CSS. Defense-in-depth: the
/// frontend additionally scopes each block's CSS to <c>#block-{id}</c> and sanitizes rich text.
/// </summary>
public static partial class CssSanitizer
{
    private static readonly Regex[] Dangerous =
    [
        Expression(),
        JavascriptScheme(),
        VbscriptScheme(),
        ImportRule(),
        Behavior(),
        MozBinding(),
        DangerousUrl(),
        TagBreakout(),
    ];

    public static string Sanitize(string css)
    {
        if (string.IsNullOrEmpty(css))
        {
            return css;
        }

        foreach (var regex in Dangerous)
        {
            css = regex.Replace(css, string.Empty);
        }

        return css;
    }

    [GeneratedRegex(@"expression\s*\(", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex Expression();

    [GeneratedRegex(@"javascript\s*:", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex JavascriptScheme();

    [GeneratedRegex(@"vbscript\s*:", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex VbscriptScheme();

    [GeneratedRegex(@"@import[^;]*;?", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex ImportRule();

    [GeneratedRegex(@"behavior\s*:", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex Behavior();

    [GeneratedRegex(@"-moz-binding[^;]*;?", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex MozBinding();

    // url( javascript:/vbscript:/data: ... )
    [GeneratedRegex(@"url\(\s*['""]?\s*(javascript|vbscript|data)\s*:[^)]*\)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex DangerousUrl();

    // Defensive: a stray </style> or tag inside CSS.
    [GeneratedRegex(@"<\s*/?\s*\w+", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex TagBreakout();
}
