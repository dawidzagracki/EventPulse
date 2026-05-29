using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace EventPulse.Api.Hubs;

/// <summary>Real-time channel for an event. Clients join the event's group to receive live updates.</summary>
[Authorize]
public sealed class EventHub : Hub
{
    public Task JoinEvent(string eventId) => Groups.AddToGroupAsync(Context.ConnectionId, eventId);

    public Task LeaveEvent(string eventId) => Groups.RemoveFromGroupAsync(Context.ConnectionId, eventId);
}
