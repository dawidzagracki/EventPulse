using EventPulse.Api.Reports;
using EventPulse.Modules.Agenda.Application;
using EventPulse.Modules.Events.Application.Queries;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Modules.Participants.Application.Feedback;
using EventPulse.Modules.Scanning.Application;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Controllers;

[ApiController]
[Route("api/events/{eventId:guid}/report")]
[Authorize(Policy = AuthPolicies.AgencyOrClient)]
public sealed class ReportsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReportsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> Get(Guid eventId, CancellationToken ct)
    {
        var ev = await _mediator.Send(new GetEventByIdQuery(eventId), ct);
        var dashboard = await _mediator.Send(new DashboardQuery(eventId), ct);
        var feedback = await _mediator.Send(new EventFeedbackQuery(eventId), ct);
        var agenda = await _mediator.Send(new ListAgendaQuery(eventId), ct);

        var pdf = EventReport.Build(ev, dashboard, feedback, agenda);
        return File(pdf, "application/pdf", $"raport-{ev.Slug}.pdf");
    }
}
