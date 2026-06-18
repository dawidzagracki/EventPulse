using EventPulse.Api.Hubs;
using EventPulse.Shared.Notifications;
using Microsoft.AspNetCore.SignalR;

namespace EventPulse.Api.Infrastructure;

public sealed class SignalREventNotifier(IHubContext<EventHub> hub, ILogger<SignalREventNotifier> logger) : IEventNotifier
{
    public async Task DashboardChangedAsync(Guid eventId, object payload, CancellationToken cancellationToken = default)
    {
        // The live-dashboard push is best-effort: a SignalR / Redis-backplane hiccup must never
        // fail the business operation that triggered it (e.g. a check-in scan at the gate).
        try
        {
            await hub.Clients.Group(eventId.ToString()).SendAsync("dashboardChanged", payload, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Dashboard broadcast for event {EventId} failed (continuing).", eventId);
        }
    }
}
