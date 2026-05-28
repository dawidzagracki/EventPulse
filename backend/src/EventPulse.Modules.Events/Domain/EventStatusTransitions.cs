namespace EventPulse.Modules.Events.Domain;

/// <summary>Allowed event lifecycle transitions. Anything not listed is rejected.</summary>
public static class EventStatusTransitions
{
    private static readonly Dictionary<EventStatus, EventStatus[]> Allowed = new()
    {
        [EventStatus.Draft] = [EventStatus.Published],
        [EventStatus.Published] = [EventStatus.Draft, EventStatus.Live],
        [EventStatus.Live] = [EventStatus.Completed],
        [EventStatus.Completed] = [EventStatus.Archived],
        [EventStatus.Archived] = [],
    };

    public static bool IsAllowed(EventStatus from, EventStatus to) =>
        from == to || (Allowed.TryGetValue(from, out var targets) && targets.Contains(to));
}
