namespace EventPulse.Shared.Domain;

/// <summary>Base type for all persisted entities. Uses sequential GUID v7 for index locality.</summary>
public abstract class Entity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
}
