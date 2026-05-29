using EventPulse.Modules.Participants.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventPulse.Infrastructure.Persistence.Configurations;

public sealed class FeedbackConfiguration : IEntityTypeConfiguration<Feedback>
{
    public void Configure(EntityTypeBuilder<Feedback> builder)
    {
        builder.ToTable("feedback");
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Comment).HasMaxLength(2000);
        builder.HasIndex(f => new { f.EventId, f.ParticipantId }).IsUnique();
        builder.HasIndex(f => f.TenantId);
    }
}
