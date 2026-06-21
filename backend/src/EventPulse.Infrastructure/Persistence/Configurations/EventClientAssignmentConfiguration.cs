using EventPulse.Modules.Events.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventPulse.Infrastructure.Persistence.Configurations;

public sealed class EventClientAssignmentConfiguration : IEntityTypeConfiguration<EventClientAssignment>
{
    public void Configure(EntityTypeBuilder<EventClientAssignment> builder)
    {
        builder.ToTable("event_client_assignments");
        builder.HasKey(a => a.Id);

        // At most one grant per (event, client) within a tenant.
        builder.HasIndex(a => new { a.TenantId, a.EventId, a.ClientUserId }).IsUnique();
        builder.HasIndex(a => a.ClientUserId); // client → their events (scoping query)
        builder.HasIndex(a => a.EventId);      // event → its clients (management UI)
    }
}
