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
}

/// <summary>
/// Renders a branded, responsive, email-client-safe HTML document (table layout + inline styles,
/// bulletproof gradient button with a solid fallback for Outlook). Shared by every outgoing e-mail
/// so they all look consistent with the app (indigo→violet→fuchsia).
/// </summary>
public static class EmailLayout
{
    private const string Grad = "linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#d946ef 100%)";
    private const string BtnFallback = "#6d28d9"; // solid colour Outlook shows instead of the gradient

    public static string Render(EmailContent c)
    {
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

        // Header — gradient bar with the wordmark.
        sb.Append($"""
            <tr><td style="background:{Grad};background-color:{BtnFallback};padding:26px 32px;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.3px;">Event<span style="color:#f5d0fe;">Pulse</span></span>
            </td></tr>
            """);

        // Body.
        sb.Append("""<tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">""");
        sb.Append($"""<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">{Enc(c.Heading)}</h1>""");

        foreach (var p in c.Paragraphs)
        {
            sb.Append($"""<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">{p}</p>""");
        }

        if (c.InfoRows.Count > 0)
        {
            sb.Append($"""
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 22px;background:#f7f8fc;border-left:4px solid #7c3aed;border-radius:10px;">
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
            sb.Append($"""
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;">
                <tr><td align="center" bgcolor="{BtnFallback}" style="border-radius:10px;background:{Grad};background-color:{BtnFallback};">
                <a href="{url}" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">{Enc(c.CtaLabel)} &rarr;</a>
                </td></tr></table>
                """);

            if (!string.IsNullOrEmpty(c.FallbackNote))
            {
                sb.Append($"""
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#9aa1af;">{Enc(c.FallbackNote)}<br>
                    <a href="{url}" style="color:#6d28d9;word-break:break-all;">{url}</a></p>
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
}
