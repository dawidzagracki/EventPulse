using System.Net;
using System.Text;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Notifications;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Invitations;

/// <summary>
/// Sends ONE email to the event's client listing every participant and their personal
/// login link, so the client can distribute the links themselves.
/// </summary>
public sealed record SendClientLinksCommand(Guid EventId, string EventName, string ClientEmail, string LinkBaseUrl, EmailBrand? Brand = null)
    : IRequest<SendClientLinksResult>;

public sealed record SendClientLinksResult(int LinkCount);

public sealed record ClientLinkRow(string Name, string Email, string Link);

public sealed class SendClientLinksHandler(IAppDbContext db, IEmailSender email)
    : IRequestHandler<SendClientLinksCommand, SendClientLinksResult>
{
    public async Task<SendClientLinksResult> Handle(SendClientLinksCommand request, CancellationToken ct)
    {
        // Primary guests with an e-mail only (accompanying persons have no login of their own).
        var participants = await db.Set<Participant>()
            .Where(p => p.EventId == request.EventId && p.ParentParticipantId == null && p.Email != null)
            .OrderBy(p => p.LastName).ThenBy(p => p.FirstName)
            .ToListAsync(ct);

        if (participants.Count == 0)
        {
            throw new ConflictException("No participants with an e-mail to include.");
        }

        var baseUrl = request.LinkBaseUrl.TrimEnd('/');
        var rows = participants
            .Select(p => new ClientLinkRow(
                $"{p.FirstName} {p.LastName}".Trim(),
                p.Email!,
                $"{baseUrl}/{p.AccessToken}"))
            .ToList();

        await email.SendAsync(ClientLinksEmail.Build(request.ClientEmail, request.EventName, rows, request.Brand), ct);
        return new SendClientLinksResult(rows.Count);
    }
}

/// <summary>Builds the client-facing digest email with a table of participant → login link.</summary>
public static class ClientLinksEmail
{
    public static EmailMessage Build(string clientEmail, string eventName, IReadOnlyList<ClientLinkRow> rows, EmailBrand? brand = null)
    {
        var body = new StringBuilder();
        body.Append(
            "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" " +
            "style=\"border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a\">");
        body.Append(
            "<tr>" +
            "<th align=\"left\" style=\"padding:8px 10px;border-bottom:2px solid #6366f1;background:#f1f5f9\">Uczestnik</th>" +
            "<th align=\"left\" style=\"padding:8px 10px;border-bottom:2px solid #6366f1;background:#f1f5f9\">E-mail</th>" +
            "<th align=\"left\" style=\"padding:8px 10px;border-bottom:2px solid #6366f1;background:#f1f5f9\">Link logowania</th>" +
            "</tr>");
        foreach (var r in rows)
        {
            var name = WebUtility.HtmlEncode(r.Name);
            var mail = WebUtility.HtmlEncode(r.Email);
            var link = WebUtility.HtmlEncode(r.Link);
            body.Append(
                "<tr>" +
                $"<td style=\"padding:8px 10px;border-bottom:1px solid #e2e8f0\">{name}</td>" +
                $"<td style=\"padding:8px 10px;border-bottom:1px solid #e2e8f0\">{mail}</td>" +
                $"<td style=\"padding:8px 10px;border-bottom:1px solid #e2e8f0\"><a href=\"{link}\" style=\"color:#6366f1\">{link}</a></td>" +
                "</tr>");
        }
        body.Append("</table>");

        var content = new EmailContent
        {
            Preheader = $"Linki logowania — {eventName}",
            Heading = $"Linki logowania — {eventName}",
            Paragraphs =
            [
                $"Poniżej znajduje się lista {rows.Count} uczestników wraz z ich osobistymi linkami logowania. "
                    + "Każdy link jest przypisany do konkretnego adresu e-mail — możesz je rozesłać samodzielnie.",
            ],
            RawHtml = body.ToString(),
            FooterNote = "Wiadomość wygenerowana w EventPulse.",
        };
        var html = EmailLayout.Render(content, brand);

        var text = new StringBuilder($"Linki logowania — {eventName}\n\n");
        foreach (var r in rows)
        {
            text.Append($"{r.Name} <{r.Email}>: {r.Link}\n");
        }

        var defaultSubject = $"Linki logowania uczestników — {eventName}";
        var subject = brand?.ResolvedSubject(defaultSubject) ?? defaultSubject;
        return new EmailMessage(clientEmail, clientEmail, subject, html, text.ToString(), brand?.FromName);
    }
}
