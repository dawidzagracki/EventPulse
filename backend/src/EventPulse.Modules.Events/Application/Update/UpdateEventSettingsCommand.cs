using EventPulse.Modules.Events.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Events.Application.Update;

/// <summary>
/// Updates the per-event settings (privacy, phone requirement, companions, anonymization, photos link).
/// A Client may only change settings on their own event.
/// </summary>
public sealed record UpdateEventSettingsCommand(
    Guid Id,
    bool UsesLocationData,
    bool PhoneRequired,
    bool AllowCompanions,
    int MaxCompanions,
    bool AnonymizeEnabled,
    int AnonymizeAfterDays,
    string? CustomPhotosUrl,
    string? CustomPhotosText,
    bool ShowAgendaTab,
    bool ShowActivitiesTab,
    bool ShowGalleryTab) : IRequest<EventDto>;

public sealed class UpdateEventSettingsValidator : AbstractValidator<UpdateEventSettingsCommand>
{
    public UpdateEventSettingsValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.MaxCompanions).InclusiveBetween(0, 50);
        RuleFor(x => x.AnonymizeAfterDays).InclusiveBetween(1, 3650);
        RuleFor(x => x.CustomPhotosUrl).MaximumLength(2048);
        RuleFor(x => x.CustomPhotosText).MaximumLength(4000);
        RuleFor(x => x.CustomPhotosUrl)
            .Must(BeAValidHttpUrl)
            .When(x => !string.IsNullOrWhiteSpace(x.CustomPhotosUrl))
            .WithMessage("CustomPhotosUrl must be a valid http(s) URL.");
    }

    private static bool BeAValidHttpUrl(string? url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}

public sealed class UpdateEventSettingsHandler : IRequestHandler<UpdateEventSettingsCommand, EventDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public UpdateEventSettingsHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<EventDto> Handle(UpdateEventSettingsCommand request, CancellationToken cancellationToken)
    {
        var ev = await _db.Set<Event>()
            .FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        // A Client may only manage their own event's settings.
        if (_currentUser.IsClient)
        {
            var email = _currentUser.Email?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(ev.ClientEmail)
                || !string.Equals(ev.ClientEmail, email, StringComparison.OrdinalIgnoreCase))
            {
                throw new NotFoundException("Event not found.");
            }
        }

        ev.UsesLocationData = request.UsesLocationData;
        ev.PhoneRequired = request.PhoneRequired;
        ev.AllowCompanions = request.AllowCompanions;
        ev.MaxCompanions = request.MaxCompanions;
        ev.AnonymizeEnabled = request.AnonymizeEnabled;
        ev.AnonymizeAfterDays = request.AnonymizeAfterDays;
        ev.CustomPhotosUrl = string.IsNullOrWhiteSpace(request.CustomPhotosUrl) ? null : request.CustomPhotosUrl.Trim();
        ev.CustomPhotosText = string.IsNullOrWhiteSpace(request.CustomPhotosText) ? null : request.CustomPhotosText.Trim();
        ev.ShowAgendaTab = request.ShowAgendaTab;
        ev.ShowActivitiesTab = request.ShowActivitiesTab;
        ev.ShowGalleryTab = request.ShowGalleryTab;

        await _db.SaveChangesAsync(cancellationToken);
        return EventDto.From(ev);
    }
}
