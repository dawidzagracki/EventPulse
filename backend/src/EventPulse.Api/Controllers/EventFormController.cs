using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Participants.Application.EventForm;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

/// <summary>
/// Admin configuration of the participant form: custom fields ("kafelki") and the
/// pre-app onboarding steps. Agency staff or the assigned client may manage these.
/// </summary>
[ApiController]
[Route("api/events/{eventId:guid}")]
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class EventFormController : ControllerBase
{
    private readonly IMediator _mediator;

    public EventFormController(IMediator mediator) => _mediator = mediator;

    [HttpGet("custom-fields")]
    public async Task<ActionResult<IReadOnlyList<CustomFieldDto>>> CustomFields(Guid eventId, CancellationToken ct)
        => Ok(await _mediator.Send(new ListCustomFieldsQuery(eventId), ct));

    [HttpPut("custom-fields")]
    public async Task<ActionResult<IReadOnlyList<CustomFieldDto>>> SaveCustomFields(
        Guid eventId, SaveCustomFieldsBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new SaveCustomFieldsCommand(eventId, body.Fields), ct));

    [HttpGet("onboarding")]
    public async Task<ActionResult<IReadOnlyList<OnboardingStepDto>>> Onboarding(Guid eventId, CancellationToken ct)
        => Ok(await _mediator.Send(new ListOnboardingQuery(eventId), ct));

    [HttpPut("onboarding")]
    public async Task<ActionResult<IReadOnlyList<OnboardingStepDto>>> SaveOnboarding(
        Guid eventId, SaveOnboardingBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new SaveOnboardingCommand(eventId, body.Steps), ct));

    public sealed record SaveCustomFieldsBody(IReadOnlyList<CustomFieldInput> Fields);

    public sealed record SaveOnboardingBody(IReadOnlyList<OnboardingStepInput> Steps);
}
