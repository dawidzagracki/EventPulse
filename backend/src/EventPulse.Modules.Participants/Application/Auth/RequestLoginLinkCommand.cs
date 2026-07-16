using System.Net;
using EventPulse.Modules.Participants.Application.Invitations;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Notifications;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Auth;

/// <summary>
/// Second login path: a guest enters their e-mail on the event's universal login page and, if it
/// matches a participant of that event, their personal token link is e-mailed to them. Always
/// succeeds silently (never reveals whether an address is registered) to avoid enumeration.
///
/// When the event allows OPEN SELF-REGISTRATION the same form also carries a name: an unknown
/// e-mail then CREATES a new participant and mails them their personal link. The event context
/// (flag + tenant + language) is resolved by the caller — this module has no Events reference.
/// </summary>
public sealed record RequestLoginLinkCommand(
    Guid EventId,
    string Email,
    string LinkBaseUrl,
    string? FirstName = null,
    string? LastName = null,
    bool AllowSelfRegistration = false,
    Guid TenantId = default,
    string DefaultLanguage = "pl",
    EmailBrand? Brand = null) : IRequest<Unit>;

public sealed class RequestLoginLinkHandler(IAppDbContext db, IEmailSender email)
    : IRequestHandler<RequestLoginLinkCommand, Unit>
{
    public async Task<Unit> Handle(RequestLoginLinkCommand request, CancellationToken ct)
    {
        var normalized = request.Email.Trim().ToLowerInvariant();
        if (normalized.Length == 0 || normalized.Length > 320 || !normalized.Contains('@')) return Unit.Value;

        // Anonymous endpoint → no tenant context; scope strictly by the (unique) event id.
        var participant = await db.Set<Participant>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                p => p.EventId == request.EventId
                     && p.ParentParticipantId == null
                     && p.Email != null
                     && p.Email.ToLower() == normalized,
                ct);

        if (participant is null && request.AllowSelfRegistration && request.TenantId != Guid.Empty)
        {
            var first = request.FirstName?.Trim() ?? string.Empty;
            var last = request.LastName?.Trim() ?? string.Empty;
            if (first.Length is 0 or > 100 || last.Length is 0 or > 100) return Unit.Value;

            participant = new Participant
            {
                TenantId = request.TenantId, // explicit — no tenant context on this anonymous path
                EventId = request.EventId,
                FirstName = first,
                LastName = last,
                Email = normalized,
                Language = request.DefaultLanguage,
                Status = ParticipantStatus.Invited,
            };
            db.Set<Participant>().Add(participant);
            await db.SaveChangesAsync(ct);
        }

        if (participant is not null)
        {
            var link = $"{request.LinkBaseUrl.TrimEnd('/')}/{participant.AccessToken}";
            await email.SendAsync(LoginLinkEmail.Build(participant, link, request.Brand), ct);
        }

        return Unit.Value; // generic success regardless — no account enumeration
    }
}

/// <summary>Bilingual "here is your login link" email (self-service second login path).</summary>
public static class LoginLinkEmail
{
    public static EmailMessage Build(Participant participant, string link, EmailBrand? brand = null)
    {
        var name = WebUtility.HtmlEncode(participant.FirstName);

        var content = new EmailContent
        {
            Preheader = "Twój link do logowania · Your login link",
            Heading = $"Cześć {name}, / Hello {name},",
            Paragraphs =
            [
                "Oto Twój osobisty link do aplikacji wydarzenia. Jest przypisany do Twojego konta — nie udostępniaj go innym.",
                InvitationEmail.Divider,
                "<em style=\"color:#6b7280;\">English:</em> Here is your personal link to open the event app. It's tied to your account — please don't share it.",
            ],
            CtaLabel = "Otwórz stronę wydarzenia / Open event page",
            CtaUrl = link,
            FallbackNote = "Jeśli przycisk nie działa, skopiuj ten link / If the button doesn't work, copy this link:",
            FooterNote = "Poprosiłeś(-aś) o ten link na stronie logowania. / You requested this link on the login page.",
        };

        var defaultSubject = "Twój link do logowania / Your login link";
        var subject = brand?.ResolvedSubject(defaultSubject) ?? defaultSubject;
        var text = $"Twój link / Your link: {link}";
        return new EmailMessage(participant.Email!, $"{participant.FirstName} {participant.LastName}", subject, EmailLayout.Render(content, brand), text, brand?.FromName);
    }
}
