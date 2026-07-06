using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Update;

/// <summary>
/// Updates the per-event transactional e-mail branding (header accent colour + logo URL).
/// A Client may only change branding on their own event.
/// </summary>
public sealed record UpdateEmailBrandingCommand(Guid Id, string? AccentColor, string? LogoUrl, string? HeaderName) : IRequest<EventDto>;

public sealed class UpdateEmailBrandingValidator : AbstractValidator<UpdateEmailBrandingCommand>
{
    public UpdateEmailBrandingValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.AccentColor)
            .Matches("^#?[0-9a-fA-F]{6}$")
            .When(x => !string.IsNullOrWhiteSpace(x.AccentColor))
            .WithMessage("AccentColor must be a 6-digit hex colour.");
        RuleFor(x => x.LogoUrl).MaximumLength(2048);
        RuleFor(x => x.HeaderName).MaximumLength(80);
        RuleFor(x => x.LogoUrl)
            .Must(BeHttpUrl)
            .When(x => !string.IsNullOrWhiteSpace(x.LogoUrl))
            .WithMessage("LogoUrl must be a valid http(s) URL.");
    }

    private static bool BeHttpUrl(string? url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var u) && (u.Scheme == Uri.UriSchemeHttp || u.Scheme == Uri.UriSchemeHttps);
}

public sealed class UpdateEmailBrandingHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<UpdateEmailBrandingCommand, EventDto>
{
    public async Task<EventDto> Handle(UpdateEmailBrandingCommand request, CancellationToken cancellationToken)
    {
        var ev = await db.Set<Event>().FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        if (currentUser.IsClient)
        {
            var email = currentUser.Email?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(ev.ClientEmail)
                || !string.Equals(ev.ClientEmail, email, StringComparison.OrdinalIgnoreCase))
            {
                throw new NotFoundException("Event not found.");
            }
        }

        var color = request.AccentColor?.Trim();
        if (!string.IsNullOrEmpty(color) && !color.StartsWith('#')) color = "#" + color;

        ev.EmailAccentColor = string.IsNullOrWhiteSpace(color) ? null : color;
        ev.EmailLogoUrl = string.IsNullOrWhiteSpace(request.LogoUrl) ? null : request.LogoUrl.Trim();
        ev.EmailHeaderName = string.IsNullOrWhiteSpace(request.HeaderName) ? null : request.HeaderName.Trim();

        await db.SaveChangesAsync(cancellationToken);
        return EventDto.From(ev);
    }
}
