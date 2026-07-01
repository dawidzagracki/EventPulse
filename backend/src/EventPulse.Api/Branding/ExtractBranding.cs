using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using FluentValidation;
using MediatR;

namespace EventPulse.Api.Branding;

/// <summary>Best-effort branding extracted from a website (colours + logo + SEO meta).</summary>
public sealed record BrandingSuggestionDto(
    string? PrimaryColor,
    string? SecondaryColor,
    string? AccentColor,
    string? LogoUrl,
    string? FaviconUrl,
    string? OgImageUrl,
    string? Title,
    string? Description);

/// <summary>Fetches a URL server-side and derives a branding suggestion the admin can apply.</summary>
public sealed record ExtractBrandingCommand(string Url) : IRequest<BrandingSuggestionDto>;

public sealed partial class ExtractBrandingHandler(IHttpClientFactory httpClientFactory)
    : IRequestHandler<ExtractBrandingCommand, BrandingSuggestionDto>
{
    public async Task<BrandingSuggestionDto> Handle(ExtractBrandingCommand request, CancellationToken ct)
    {
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new ValidationException("Provide a valid http(s) URL.");
        }

        if (IsBlockedHost(uri.Host))
        {
            throw new ValidationException("This host is not allowed.");
        }

        // Named client has automatic gzip/deflate/brotli decompression — without it
        // many sites' compressed HTML arrives as bytes we can't parse, so nothing is found.
        var client = httpClientFactory.CreateClient("branding");
        client.Timeout = TimeSpan.FromSeconds(8);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("EventPulseBot/1.0");

        string html;
        try
        {
            using var response = await client.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ct);
            response.EnsureSuccessStatusCode();
            var bytes = await response.Content.ReadAsByteArrayAsync(ct);
            // Cap the parsed size — the <head> with the meta tags we want is always near the top.
            var take = Math.Min(bytes.Length, 512 * 1024);
            html = System.Text.Encoding.UTF8.GetString(bytes, 0, take);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new ValidationException("Could not fetch the page. Check the URL and try again.");
        }

        string? Abs(string? href) =>
            string.IsNullOrWhiteSpace(href) ? null
            : Uri.TryCreate(uri, href, out var resolved) ? resolved.ToString() : null;

        var themeColor = NormalizeHex(MetaContent(html, "name", "theme-color"));
        var ogImage = Abs(MetaContent(html, "property", "og:image"));
        var appleIcon = Abs(LinkHref(html, "apple-touch-icon"));
        var icon = Abs(LinkHref(html, "icon") ?? LinkHref(html, "shortcut icon"));
        // Extra logo hints many sites expose even when there's no apple-touch-icon.
        var ogLogo = Abs(MetaContent(html, "property", "og:logo"));
        var imageSrc = Abs(LinkHref(html, "image_src"));
        var maskIcon = Abs(LinkHref(html, "mask-icon"));
        var tileImage = Abs(MetaContent(html, "name", "msapplication-TileImage"));
        // Last-resort favicon at the conventional path (served even without a <link>).
        var faviconFallback = $"{uri.Scheme}://{uri.Authority}/favicon.ico";
        var title = HtmlDecode(MetaContent(html, "property", "og:title") ?? TagText(html, "title"));
        var description = HtmlDecode(MetaContent(html, "name", "description") ?? MetaContent(html, "property", "og:description"));

        // Brand colours often live in linked CSS, not the HTML — scan a few same-origin
        // stylesheets too so sites that keep colours in external CSS still yield a palette.
        var colorCorpus = html + await FetchStylesheetsAsync(client, uri, html, ct);
        var (primary, secondary, accent) = PickBrandColors(colorCorpus, themeColor);

        return new BrandingSuggestionDto(
            PrimaryColor: primary,
            SecondaryColor: secondary,
            AccentColor: accent,
            LogoUrl: appleIcon ?? ogLogo ?? ogImage ?? imageSrc ?? tileImage ?? icon ?? maskIcon ?? faviconFallback,
            FaviconUrl: icon ?? appleIcon ?? faviconFallback,
            OgImageUrl: ogImage,
            Title: Trunc(title, 200),
            Description: Trunc(description, 400));
    }

    // ---- Brand colour extraction ----

    /// <summary>
    /// Picks the two dominant brand colours: prefers a brandish declared theme-color as primary,
    /// and finds a second, hue-distinct colour from the page's inline / &lt;style&gt; CSS as the accent.
    /// Greys, near-white and near-black are ignored so we get brand colours, not text/background.
    /// Background stays untouched (white by default).
    /// </summary>
    private static (string? Primary, string? Secondary, string? Accent) PickBrandColors(string html, string? themeColor)
    {
        var ranked = ExtractColorCandidates(html); // brandish colours, most frequent first

        string? primary = themeColor is not null && IsBrandish(themeColor) ? themeColor : null;
        primary ??= ranked.FirstOrDefault() ?? themeColor;
        if (primary is null) return (null, null, null);

        TryHexToHsl(primary, out var ph, out _, out _);

        // Accent = the most common candidate whose hue is clearly different from the primary.
        string? accent = null;
        foreach (var c in ranked)
        {
            if (string.Equals(c, primary, StringComparison.OrdinalIgnoreCase)) continue;
            if (TryHexToHsl(c, out var ch, out _, out _) && HueDistance(ph, ch) >= 25)
            {
                accent = c;
                break;
            }
        }

        // When the page exposes only one colour, derive a harmonious tint/accent instead.
        string? secondary = null;
        if (TryHexToHsl(primary, out var h, out var s, out var l))
        {
            secondary = HslToHex(h, Math.Clamp(s * 0.85, 0, 1), Math.Clamp(l + 0.12, 0, 0.95));
            accent ??= HslToHex((h + 24) % 360, Math.Clamp(s * 1.05, 0, 1), Math.Clamp(l * 0.82, 0.2, 0.9));
        }

        return (primary, secondary, accent);
    }

    /// <summary>Fetches up to 3 same-origin stylesheets and returns their concatenated text (best-effort).</summary>
    private static async Task<string> FetchStylesheetsAsync(HttpClient client, Uri page, string html, CancellationToken ct)
    {
        var sb = new System.Text.StringBuilder();
        var hrefs = StylesheetHrefs(html)
            .Select(h => Uri.TryCreate(page, h, out var u) ? u : null)
            .Where(u => u is not null
                        && (u!.Scheme == Uri.UriSchemeHttp || u.Scheme == Uri.UriSchemeHttps)
                        && string.Equals(u.Host, page.Host, StringComparison.OrdinalIgnoreCase)
                        && !IsBlockedHost(u.Host))
            .Distinct()
            .Take(3);

        foreach (var u in hrefs)
        {
            try
            {
                using var resp = await client.GetAsync(u, HttpCompletionOption.ResponseHeadersRead, ct);
                if (!resp.IsSuccessStatusCode) continue;
                var bytes = await resp.Content.ReadAsByteArrayAsync(ct);
                sb.Append(System.Text.Encoding.UTF8.GetString(bytes, 0, Math.Min(bytes.Length, 256 * 1024)));
            }
            catch
            {
                // best-effort — a failed stylesheet just means fewer colour hints
            }
        }

        return sb.ToString();
    }

    private static IEnumerable<string> StylesheetHrefs(string html)
    {
        foreach (Match m in Regex.Matches(html, "<link[^>]*rel\\s*=\\s*[\"'][^\"']*stylesheet[^\"']*[\"'][^>]*>", RegexOptions.IgnoreCase))
        {
            var href = Regex.Match(m.Value, "href\\s*=\\s*[\"']([^\"']+)[\"']", RegexOptions.IgnoreCase);
            if (href.Success) yield return href.Groups[1].Value.Trim();
        }
    }

    private static bool IsBrandish(string hex) =>
        TryHexToHsl(hex, out _, out var s, out var l) && s >= 0.18 && l is >= 0.1 and <= 0.9;

    private static double HueDistance(double a, double b)
    {
        var d = Math.Abs(a - b) % 360;
        return d > 180 ? 360 - d : d;
    }

    /// <summary>All brand-ish colours in the HTML (inline styles + &lt;style&gt; blocks + rgb()), most frequent first.</summary>
    private static List<string> ExtractColorCandidates(string html)
    {
        var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        void Bump(string? hex)
        {
            if (hex is null || !IsBrandish(hex)) return;
            counts[hex] = counts.GetValueOrDefault(hex) + 1;
        }

        foreach (Match m in Regex.Matches(html, "#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b"))
        {
            Bump(NormalizeHex(m.Value));
        }
        foreach (Match m in Regex.Matches(html, @"rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})", RegexOptions.IgnoreCase))
        {
            int r = int.Parse(m.Groups[1].Value), g = int.Parse(m.Groups[2].Value), b = int.Parse(m.Groups[3].Value);
            if (r <= 255 && g <= 255 && b <= 255)
            {
                Bump($"#{r:x2}{g:x2}{b:x2}");
            }
        }

        return counts.OrderByDescending(kv => kv.Value).Select(kv => kv.Key).ToList();
    }

    // ---- HTML extraction (best-effort regex over the head) ----

    private static string? MetaContent(string html, string attr, string value)
    {
        // Match <meta {attr}="value" ... content="...">  in either attribute order.
        var m = Regex.Match(html,
            $"<meta[^>]*{attr}\\s*=\\s*[\"']{Regex.Escape(value)}[\"'][^>]*content\\s*=\\s*[\"']([^\"']+)[\"']",
            RegexOptions.IgnoreCase);
        if (m.Success) return m.Groups[1].Value.Trim();

        m = Regex.Match(html,
            $"<meta[^>]*content\\s*=\\s*[\"']([^\"']+)[\"'][^>]*{attr}\\s*=\\s*[\"']{Regex.Escape(value)}[\"']",
            RegexOptions.IgnoreCase);
        return m.Success ? m.Groups[1].Value.Trim() : null;
    }

    private static string? LinkHref(string html, string rel)
    {
        var m = Regex.Match(html,
            $"<link[^>]*rel\\s*=\\s*[\"'][^\"']*{Regex.Escape(rel)}[^\"']*[\"'][^>]*href\\s*=\\s*[\"']([^\"']+)[\"']",
            RegexOptions.IgnoreCase);
        if (m.Success) return m.Groups[1].Value.Trim();

        m = Regex.Match(html,
            $"<link[^>]*href\\s*=\\s*[\"']([^\"']+)[\"'][^>]*rel\\s*=\\s*[\"'][^\"']*{Regex.Escape(rel)}[^\"']*[\"']",
            RegexOptions.IgnoreCase);
        return m.Success ? m.Groups[1].Value.Trim() : null;
    }

    private static string? TagText(string html, string tag)
    {
        var m = Regex.Match(html, $"<{tag}[^>]*>([^<]+)</{tag}>", RegexOptions.IgnoreCase);
        return m.Success ? m.Groups[1].Value.Trim() : null;
    }

    private static string? HtmlDecode(string? s) => s is null ? null : WebUtility.HtmlDecode(s);

    private static string? Trunc(string? s, int max) =>
        s is null ? null : s.Length <= max ? s : s[..max];

    // ---- Colour helpers ----

    private static string? NormalizeHex(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        raw = raw.Trim();
        var m = Regex.Match(raw, "^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$");
        if (!m.Success) return null;
        var hex = m.Groups[1].Value;
        if (hex.Length == 3)
        {
            hex = string.Concat(hex[0], hex[0], hex[1], hex[1], hex[2], hex[2]);
        }

        return "#" + hex.ToLowerInvariant();
    }

    private static bool TryHexToHsl(string hex, out double h, out double s, out double l)
    {
        h = s = l = 0;
        hex = hex.TrimStart('#');
        if (hex.Length != 6) return false;

        var r = int.Parse(hex[..2], NumberStyles.HexNumber, CultureInfo.InvariantCulture) / 255.0;
        var g = int.Parse(hex.Substring(2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture) / 255.0;
        var b = int.Parse(hex.Substring(4, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture) / 255.0;

        var max = Math.Max(r, Math.Max(g, b));
        var min = Math.Min(r, Math.Min(g, b));
        l = (max + min) / 2;
        var d = max - min;
        if (d == 0) { h = 0; s = 0; return true; }

        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max == r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max == g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        return true;
    }

    private static string HslToHex(double h, double s, double l)
    {
        double Channel(double p, double q, double t)
        {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1.0 / 6) return p + (q - p) * 6 * t;
            if (t < 1.0 / 2) return q;
            if (t < 2.0 / 3) return p + (q - p) * (2.0 / 3 - t) * 6;
            return p;
        }

        double r, g, b;
        if (s == 0)
        {
            r = g = b = l;
        }
        else
        {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            var hk = h / 360;
            r = Channel(p, q, hk + 1.0 / 3);
            g = Channel(p, q, hk);
            b = Channel(p, q, hk - 1.0 / 3);
        }

        return $"#{(int)Math.Round(r * 255):x2}{(int)Math.Round(g * 255):x2}{(int)Math.Round(b * 255):x2}";
    }

    // ---- SSRF guard: refuse loopback / private / link-local hosts ----
    private static bool IsBlockedHost(string host)
    {
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase)) return true;
        if (!IPAddress.TryParse(host, out var ip)) return false; // hostnames resolve later; basic literal guard only

        if (IPAddress.IsLoopback(ip)) return true;
        var bytes = ip.GetAddressBytes();
        if (bytes.Length == 4)
        {
            return bytes[0] == 10
                || (bytes[0] == 192 && bytes[1] == 168)
                || (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
                || (bytes[0] == 169 && bytes[1] == 254);
        }

        return ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal;
    }
}
