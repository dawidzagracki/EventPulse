using EventPulse.Modules.Gallery;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventPulse.Infrastructure.Persistence.Configurations;

public sealed class PhotoConfiguration : IEntityTypeConfiguration<Photo>
{
    public void Configure(EntityTypeBuilder<Photo> builder)
    {
        builder.ToTable("photos");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.StorageKey).HasMaxLength(512).IsRequired();
        builder.Property(p => p.ContentType).HasMaxLength(128).IsRequired();
        builder.Property(p => p.FileName).HasMaxLength(300).IsRequired();
        builder.HasIndex(p => p.EventId);
        builder.HasIndex(p => p.TenantId);
    }
}
