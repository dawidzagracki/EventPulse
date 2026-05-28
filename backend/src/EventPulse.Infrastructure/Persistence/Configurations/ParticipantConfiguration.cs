using EventPulse.Modules.Participants.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventPulse.Infrastructure.Persistence.Configurations;

public sealed class ParticipantConfiguration : IEntityTypeConfiguration<Participant>
{
    public void Configure(EntityTypeBuilder<Participant> builder)
    {
        builder.ToTable("participants");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.FirstName).HasMaxLength(200).IsRequired();
        builder.Property(p => p.LastName).HasMaxLength(200).IsRequired();
        builder.Property(p => p.Email).HasMaxLength(320).IsRequired();
        builder.Property(p => p.Phone).HasMaxLength(50);
        builder.Property(p => p.Company).HasMaxLength(200);
        builder.Property(p => p.Position).HasMaxLength(200);
        builder.Property(p => p.Language).HasMaxLength(2).IsRequired();
        builder.Property(p => p.GroupName).HasMaxLength(200);
        builder.Property(p => p.TableName).HasMaxLength(100);
        builder.Property(p => p.RoomNumber).HasMaxLength(100);
        builder.Property(p => p.ArrivalTime).HasMaxLength(20);
        builder.Property(p => p.FlightNumber).HasMaxLength(20);
        builder.Property(p => p.DietaryPreferences).HasMaxLength(1000);
        builder.Property(p => p.ShirtSize).HasMaxLength(20);
        builder.Property(p => p.Wishes).HasMaxLength(2000);
        builder.Property(p => p.Notes).HasMaxLength(2000);
        builder.Property(p => p.RodoVersion).HasMaxLength(20);
        builder.Property(p => p.Status).HasConversion<int>();
        builder.Ignore(p => p.HasAcceptedRodo);

        builder.HasIndex(p => new { p.EventId, p.Email }).IsUnique();
        builder.HasIndex(p => p.TenantId);
        builder.HasIndex(p => new { p.EventId, p.Status });
        builder.HasIndex(p => p.AccessToken).IsUnique();
    }
}
