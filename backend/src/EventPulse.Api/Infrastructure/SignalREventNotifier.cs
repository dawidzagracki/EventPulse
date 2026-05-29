using EventPulse.Api.Hubs;
using EventPulse.Shared.Notifications;
using Microsoft.AspNetCore.SignalR;

namespace EventPulse.Api.Infrastructure;

public sealed class SignalREventNotifier(IHubContext<EventHub> hub) : IEventNotifier
{
    public Task DashboardChangedAsync(Guid eventId, object payload, CancellationToken cancellationToken = default)
        => hub.Clients.Group(eventId.ToString()).SendAsync("dashboardChanged", payload, cancellationToken);
}
