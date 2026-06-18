using EventPulse.Modules.Scanning.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventPulse.Infrastructure.Persistence.Configurations;

public sealed class ScanEventConfiguration : IEntityTypeConfiguration<ScanEvent>
{
    public void Configure(EntityTypeBuilder<ScanEvent> builder)
    {
        builder.ToTable("scan_events");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Kind).HasConversion<int>();
        builder.Property(s => s.StationCode).HasMaxLength(100);

        builder.HasIndex(s => s.ClientId).IsUnique(); // idempotency
        builder.HasIndex(s => s.EventId);
        builder.HasIndex(s => s.ParticipantId);
        builder.HasIndex(s => s.TenantId);

        // Speeds up the per-participant station-limit count.
        builder.HasIndex(s => new { s.EventId, s.ParticipantId, s.StationCode });
    }
}

public sealed class StationConfiguration : IEntityTypeConfiguration<Station>
{
    public void Configure(EntityTypeBuilder<Station> builder)
    {
        builder.ToTable("stations");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Name).HasMaxLength(100).IsRequired();
        builder.Property(s => s.NameEn).HasMaxLength(100);
        builder.Property(s => s.Icon).HasMaxLength(16);

        builder.HasIndex(s => s.TenantId);
        builder.HasIndex(s => new { s.EventId, s.Order });
    }
}
