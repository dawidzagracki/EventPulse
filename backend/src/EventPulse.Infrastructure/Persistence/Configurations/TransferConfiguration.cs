using EventPulse.Modules.Logistics;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventPulse.Infrastructure.Persistence.Configurations;

public sealed class TransferConfiguration : IEntityTypeConfiguration<Transfer>
{
    public void Configure(EntityTypeBuilder<Transfer> builder)
    {
        builder.ToTable("transfers");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Name).HasMaxLength(200).IsRequired();
        builder.Property(t => t.MeetingPoint).HasMaxLength(300).IsRequired();
        builder.Property(t => t.Note).HasMaxLength(1000);
        builder.HasIndex(t => t.EventId);
        builder.HasIndex(t => t.TenantId);
    }
}
