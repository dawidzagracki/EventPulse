namespace EventPulse.Modules.Events.Domain;

/// <summary>Lifecycle of an event. Transitions: Draft → Published → Live → Completed → Archived.</summary>
public enum EventStatus
{
    Draft = 0,
    Published = 1,
    Live = 2,
    Completed = 3,
    Archived = 4,
}
