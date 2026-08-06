using EventPulse.Api.Reports;
using EventPulse.Modules.Agenda.Application;
using EventPulse.Modules.Content.Application;
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
        // The report is printed in the event's own colours, and carries detail the live dashboard
        // has no reason to compute (arrival curve, stays, who came from where).
        var branding = await _mediator.Send(new GetReportBrandingQuery(eventId), ct);
        var stats = await _mediator.Send(new EventReportStatsQuery(eventId), ct);

        var pdf = EventReport.Build(ev, branding, dashboard, stats, feedback, agenda);
        return File(pdf, "application/pdf", $"raport-{ev.Slug}.pdf");
    }
}
