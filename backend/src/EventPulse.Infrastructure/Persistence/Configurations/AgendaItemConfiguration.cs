using EventPulse.Modules.Agenda.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventPulse.Infrastructure.Persistence.Configurations;

public sealed class AgendaItemConfiguration : IEntityTypeConfiguration<AgendaItem>
{
    public void Configure(EntityTypeBuilder<AgendaItem> builder)
    {
        builder.ToTable("agenda_items");
        builder.HasKey(i => i.Id);

        builder.Property(i => i.TitlePl).HasMaxLength(300).IsRequired();
        builder.Property(i => i.TitleEn).HasMaxLength(300).IsRequired();
        builder.Property(i => i.DescriptionPl).HasMaxLength(4000);
        builder.Property(i => i.DescriptionEn).HasMaxLength(4000);
        builder.Property(i => i.Type).HasConversion<int>();
        builder.Property(i => i.LocationName).HasMaxLength(300);
        builder.Property(i => i.LocationMapUrl).HasMaxLength(2048);
        builder.Property(i => i.SpeakerName).HasMaxLength(200);
        builder.Property(i => i.SpeakerPhone).HasMaxLength(50);
        builder.Property(i => i.SpeakerPhotoUrl).HasMaxLength(2048);
        builder.Property(i => i.Menu).HasMaxLength(4000);
        builder.Property(i => i.DressCode).HasMaxLength(200);
        builder.Property(i => i.GroupName).HasMaxLength(200);

        builder.HasIndex(i => new { i.EventId, i.StartsAt });
        builder.HasIndex(i => i.TenantId);

        builder.Ignore(i => i.DomainEvents);
    }
}
