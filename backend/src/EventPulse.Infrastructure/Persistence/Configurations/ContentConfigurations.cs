using EventPulse.Modules.Content.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventPulse.Infrastructure.Persistence.Configurations;

public sealed class EventPageConfiguration : IEntityTypeConfiguration<EventPage>
{
    public void Configure(EntityTypeBuilder<EventPage> builder)
    {
        builder.ToTable("event_pages");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.DraftContent).HasColumnType("jsonb").IsRequired();
        builder.Property(p => p.PublishedContent).HasColumnType("jsonb");

        builder.Property(p => p.PrimaryColor).HasMaxLength(32).IsRequired();
        builder.Property(p => p.SecondaryColor).HasMaxLength(32).IsRequired();
        builder.Property(p => p.AccentColor).HasMaxLength(32).IsRequired();
        builder.Property(p => p.FontFamily).HasMaxLength(100).IsRequired();
        builder.Property(p => p.LogoUrl).HasMaxLength(2048);
        builder.Property(p => p.FaviconUrl).HasMaxLength(2048);
        builder.Property(p => p.BackgroundColor).HasMaxLength(32);
        builder.Property(p => p.SeoTitle).HasMaxLength(200);
        builder.Property(p => p.SeoDescription).HasMaxLength(400);
        builder.Property(p => p.OgImageUrl).HasMaxLength(2048);

        builder.HasIndex(p => p.EventId).IsUnique();
        builder.HasIndex(p => p.TenantId);
    }
}

public sealed class PageVersionConfiguration : IEntityTypeConfiguration<PageVersion>
{
    public void Configure(EntityTypeBuilder<PageVersion> builder)
    {
        builder.ToTable("page_versions");
        builder.HasKey(v => v.Id);

        builder.Property(v => v.Content).HasColumnType("jsonb").IsRequired();

        builder.HasIndex(v => new { v.EventPageId, v.Version }).IsUnique();
        builder.HasIndex(v => v.TenantId);
    }
}
