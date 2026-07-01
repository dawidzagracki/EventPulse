using FluentValidation;

namespace EventPulse.Modules.Events.Application.Create;

public sealed class CreateEventValidator : AbstractValidator<CreateEventCommand>
{
    public CreateEventValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.EndsAt).GreaterThan(x => x.StartsAt).WithMessage("EndsAt must be after StartsAt.");
        RuleFor(x => x.Location).MaximumLength(300);
        RuleFor(x => x.DefaultLanguage).Must(l => l is null or "pl" or "en")
            .WithMessage("DefaultLanguage must be 'pl' or 'en'.");
        // Every event must belong to at least one client.
        RuleFor(x => x.ClientEmail).NotEmpty().WithMessage("A client e-mail is required.")
            .EmailAddress().MaximumLength(320);
    }
}
