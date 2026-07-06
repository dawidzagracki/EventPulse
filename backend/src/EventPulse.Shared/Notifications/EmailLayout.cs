using System.Globalization;
using System.Net;
using System.Text;

namespace EventPulse.Shared.Notifications;

/// <summary>One label/value line shown inside the highlighted info card (e.g. "When: …").</summary>
public sealed record EmailInfoRow(string Label, string Value);

/// <summary>
/// The pieces a transactional e-mail wants to show. Paragraphs are treated as trusted HTML
/// (callers encode any user data themselves); everything else is HTML-encoded by the renderer.
/// </summary>
public sealed class EmailContent
{
    public string Heading { get; init; } = "";
    public List<string> Paragraphs { get; init; } = new();
    public List<EmailInfoRow> InfoRows { get; init; } = new();
    public string? CtaLabel { get; init; }
    public string? CtaUrl { get; init; }
    public string? FallbackNote { get; init; }
    public string Preheader { get; init; } = "";
    public string FooterNote { get; init; } = "";

    /// <summary>Trusted raw HTML block rendered after the paragraphs (e.g. a data table). Caller-encoded.</summary>
    public string? RawHtml { get; init; }
}

/// <summary>
/// Renders a branded, responsive, email-client-safe HTML document (table layout + inline styles,
/// bulletproof gradient button with a solid fallback for Outlook). Shared by every outgoing e-mail
/// so they all look consistent with the app. An optional <see cref="EmailBrand"/> overrides the
/// header colour/logo and shows the event name — a null brand keeps the default EventPulse look.
/// </summary>
public static class EmailLayout
{
    private const string Grad = "linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#d946ef 100%)";
    private const string DefaultAccent = "#6d28d9"; // solid colour Outlook shows instead of the gradient

    public static string Render(EmailContent c, EmailBrand? brand = null)
    {
        // Resolve branding. A valid custom accent switches the gradient header/button to a solid
        // brand colour with auto-picked (light/dark) text; anything invalid falls back to default.
        var accent = NormalizeHex(brand?.AccentColor);
        var useAccent = accent is not null;
        var headerBg = useAccent ? accent! : Grad;
        var headerFallback = useAccent ? accent! : DefaultAccent;
        var darkText = useAccent && IsLight(accent!);
        var on = darkText ? "#111827" : "#ffffff";
        var onDim = darkText ? "rgba(17,24,39,0.62)" : "rgba(255,255,255,0.82)";
        var btnText = useAccent ? on : "#ffffff";
        // Link on a white body: a too-light accent is unreadable, so keep the safe default there.
        var linkColor = useAccent && !IsLight(accent!) ? accent! : DefaultAccent;
        var infoBorder = useAccent ? accent! : "#7c3aed";
        var logo = brand?.LogoUrl?.Trim();
        var hasLogo = !string.IsNullOrEmpty(logo);
        var eventName = brand?.EventName?.Trim();
        var hasName = !string.IsNullOrEmpty(eventName);

        var sb = new StringBuilder();

        sb.Append("""
            <!DOCTYPE html>
            <html lang="pl"><head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="x-apple-disable-message-reformatting">
            <title>EventPulse</title>
            </head>
            <body style="margin:0;padding:0;background:#eef0f8;-webkit-font-smoothing:antialiased;">
            """);

        // Hidden preheader (preview text in the inbox list).
        sb.Append($"""<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef0f8;">{Enc(c.Preheader)}</div>""");

        sb.Append("""
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f8;padding:24px 12px;">
            <tr><td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.12);">
            """);

        // Header — brand bar (accent colour or default gradient) with wordmark, event name and logo.
        sb.Append($"""<tr><td style="background:{headerBg};background-color:{headerFallback};padding:22px 32px;">""");
        if (hasName || hasLogo)
        {
            sb.Append("""<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>""");
            sb.Append("""<td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;">""");
            sb.Append($"""<span style="font-size:14px;font-weight:bold;color:{onDim};letter-spacing:-0.2px;">EventPulse</span>""");
            if (hasName)
            {
                sb.Append($"""<div style="font-size:20px;font-weight:bold;color:{on};margin-top:3px;line-height:1.25;">{Enc(eventName)}</div>""");
            }
            sb.Append("</td>");
            if (hasLogo)
            {
                sb.Append($"""<td align="right" style="vertical-align:middle;width:130px;"><img src="{Enc(logo)}" alt="" height="38" style="max-height:38px;max-width:130px;border:0;display:inline-block;"></td>""");
            }
            sb.Append("</tr></table>");
        }
        else if (useAccent)
        {
            sb.Append($"""<span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:{on};letter-spacing:-0.3px;">EventPulse</span>""");
        }
        else
        {
            sb.Append("""<span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.3px;">Event<span style="color:#f5d0fe;">Pulse</span></span>""");
        }
        sb.Append("</td></tr>");

        // Body.
        sb.Append("""<tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">""");
        sb.Append($"""<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">{Enc(c.Heading)}</h1>""");

        foreach (var p in c.Paragraphs)
        {
            sb.Append($"""<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">{p}</p>""");
        }

        if (!string.IsNullOrEmpty(c.RawHtml))
        {
            sb.Append($"""<div style="margin:6px 0 18px;">{c.RawHtml}</div>""");
        }

        if (c.InfoRows.Count > 0)
        {
            sb.Append($"""
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 22px;background:#f7f8fc;border-left:4px solid {infoBorder};border-radius:10px;">
                <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
                """);
            for (var i = 0; i < c.InfoRows.Count; i++)
            {
                var row = c.InfoRows[i];
                var mb = i == c.InfoRows.Count - 1 ? "0" : "12px";
                sb.Append($"""
                    <div style="margin:0 0 {mb};">
                    <span style="display:block;margin-bottom:2px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9aa1af;">{Enc(row.Label)}</span>
                    <span style="font-size:15px;color:#1f2937;font-weight:bold;">{Enc(row.Value)}</span>
                    </div>
                    """);
            }
            sb.Append("</td></tr></table>");
        }

        if (!string.IsNullOrEmpty(c.CtaLabel) && !string.IsNullOrEmpty(c.CtaUrl))
        {
            var url = Enc(c.CtaUrl);
            var btnBg = useAccent ? accent! : Grad;
            sb.Append($"""
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;">
                <tr><td align="center" bgcolor="{headerFallback}" style="border-radius:10px;background:{btnBg};background-color:{headerFallback};">
                <a href="{url}" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:{btnText};text-decoration:none;border-radius:10px;">{Enc(c.CtaLabel)} &rarr;</a>
                </td></tr></table>
                """);

            if (!string.IsNullOrEmpty(c.FallbackNote))
            {
                sb.Append($"""
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#9aa1af;">{Enc(c.FallbackNote)}<br>
                    <a href="{url}" style="color:{linkColor};word-break:break-all;">{url}</a></p>
                    """);
            }
        }

        sb.Append("</td></tr>");

        // Footer.
        sb.Append($"""
            <tr><td style="padding:18px 32px 26px;border-top:1px solid #eceef5;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#9aa1af;">{Enc(c.FooterNote)}</p>
            <p style="margin:8px 0 0;font-size:12px;color:#c2c7d2;">EventPulse &middot; automatyczna wiadomość</p>
            </td></tr>
            """);

        sb.Append("</table></td></tr></table></body></html>");
        return sb.ToString();
    }

    private static string Enc(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);

    /// <summary>Normalizes "#rgb"/"#rrggbb" (with or without '#') to "#rrggbb", or null if invalid.</summary>
    private static string? NormalizeHex(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var v = raw.Trim().TrimStart('#').ToLowerInvariant();
        if (v.Length == 3 && v.All(Uri.IsHexDigit))
            v = string.Concat(v[0], v[0], v[1], v[1], v[2], v[2]);
        return v.Length == 6 && v.All(Uri.IsHexDigit) ? "#" + v : null;
    }

    /// <summary>True when a colour is light enough to need dark (not white) text on top.</summary>
    private static bool IsLight(string hex)
    {
        var h = hex.TrimStart('#');
        var r = int.Parse(h.Substring(0, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture) / 255.0;
        var g = int.Parse(h.Substring(2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture) / 255.0;
        var b = int.Parse(h.Substring(4, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture) / 255.0;
        var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return lum > 0.62;
    }
}
