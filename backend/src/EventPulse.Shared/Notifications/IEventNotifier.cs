namespace EventPulse.Shared.Notifications;

/// <summary>Pushes real-time updates to clients watching an event (implemented via SignalR in the host).</summary>
public interface IEventNotifier
{
    Task DashboardChangedAsync(Guid eventId, object payload, CancellationToken cancellationToken = default);
}
