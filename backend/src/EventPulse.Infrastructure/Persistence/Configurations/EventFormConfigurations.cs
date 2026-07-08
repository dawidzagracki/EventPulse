using EventPulse.Modules.Participants.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventPulse.Infrastructure.Persistence.Configurations;

public sealed class EventCustomFieldConfiguration : IEntityTypeConfiguration<EventCustomField>
{
    public void Configure(EntityTypeBuilder<EventCustomField> builder)
    {
        builder.ToTable("event_custom_fields");
        builder.HasKey(f => f.Id);

        builder.Property(f => f.LabelPl).HasMaxLength(200).IsRequired();
        builder.Property(f => f.LabelEn).HasMaxLength(200);
        builder.Property(f => f.Type).HasConversion<int>();
        builder.Property(f => f.OptionsJson).HasMaxLength(2000);
        builder.Property(f => f.OptionRulesJson).HasMaxLength(4000);

        builder.HasIndex(f => f.TenantId);
        builder.HasIndex(f => new { f.EventId, f.Order });
    }
}

public sealed class EventOnboardingStepConfiguration : IEntityTypeConfiguration<EventOnboardingStep>
{
    public void Configure(EntityTypeBuilder<EventOnboardingStep> builder)
    {
        builder.ToTable("event_onboarding_steps");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.TitlePl).HasMaxLength(200).IsRequired();
        builder.Property(s => s.TitleEn).HasMaxLength(200);
        builder.Property(s => s.BodyPl).HasMaxLength(4000);
        builder.Property(s => s.BodyEn).HasMaxLength(4000);

        builder.HasIndex(s => s.TenantId);
        builder.HasIndex(s => new { s.EventId, s.Order });
    }
}
