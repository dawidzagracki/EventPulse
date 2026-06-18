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

        var client = httpClientFactory.CreateClient();
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
        var title = HtmlDecode(MetaContent(html, "property", "og:title") ?? TagText(html, "title"));
        var description = HtmlDecode(MetaContent(html, "name", "description") ?? MetaContent(html, "property", "og:description"));

        string? secondary = null, accent = null;
        if (themeColor is not null && TryHexToHsl(themeColor, out var h, out var s, out var l))
        {
            secondary = HslToHex((h + 30) % 360, s, l);
            accent = HslToHex((h + 180) % 360, s, l);
        }

        return new BrandingSuggestionDto(
            PrimaryColor: themeColor,
            SecondaryColor: secondary,
            AccentColor: accent,
            LogoUrl: appleIcon ?? ogImage ?? icon,
            FaviconUrl: icon ?? appleIcon,
            OgImageUrl: ogImage,
            Title: Trunc(title, 200),
            Description: Trunc(description, 400));
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
