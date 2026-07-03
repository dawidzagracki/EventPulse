using EventPulse.Modules.Events.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventPulse.Infrastructure.Persistence.Configurations;

public sealed class EventConfiguration : IEntityTypeConfiguration<Event>
{
    public void Configure(EntityTypeBuilder<Event> builder)
    {
        builder.ToTable("events");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Name).HasMaxLength(200).IsRequired();
        builder.Property(e => e.Slug).HasMaxLength(160).IsRequired();
        builder.Property(e => e.Location).HasMaxLength(300);
        builder.Property(e => e.DefaultLanguage).HasMaxLength(2).IsRequired();
        builder.Property(e => e.ClientEmail).HasMaxLength(320);
        builder.Property(e => e.Status).HasConversion<int>();

        builder.Property(e => e.CustomPhotosUrl).HasMaxLength(2048);
        builder.Property(e => e.CustomPhotosText).HasMaxLength(4000);

        // Participant-app tabs default to visible so existing events are unaffected.
        builder.Property(e => e.ShowAgendaTab).HasDefaultValue(true);
        builder.Property(e => e.ShowActivitiesTab).HasDefaultValue(true);
        builder.Property(e => e.ShowGalleryTab).HasDefaultValue(true);
        builder.Property(e => e.ShowPreferencesTile).HasDefaultValue(true);

        builder.HasIndex(e => e.Slug).IsUnique();
        builder.HasIndex(e => e.TenantId);
        builder.HasIndex(e => new { e.TenantId, e.Status });

        builder.Ignore(e => e.DomainEvents);
    }
}
