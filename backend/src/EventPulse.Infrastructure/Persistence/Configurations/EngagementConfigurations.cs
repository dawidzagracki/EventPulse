using EventPulse.Modules.Engagement;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventPulse.Infrastructure.Persistence.Configurations;

public sealed class ContestConfiguration : IEntityTypeConfiguration<Contest>
{
    public void Configure(EntityTypeBuilder<Contest> builder)
    {
        builder.ToTable("contests");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Name).HasMaxLength(200).IsRequired();
        builder.Property(c => c.Mode).HasConversion<int>();
        builder.HasIndex(c => c.EventId);
        builder.HasIndex(c => c.TenantId);
    }
}

public sealed class ContestResultConfiguration : IEntityTypeConfiguration<ContestResult>
{
    public void Configure(EntityTypeBuilder<ContestResult> builder)
    {
        builder.ToTable("contest_results");
        builder.HasKey(r => r.Id);
        builder.HasIndex(r => new { r.ContestId, r.ParticipantId }).IsUnique();
        builder.HasIndex(r => r.TenantId);
    }
}

public sealed class QuizConfiguration : IEntityTypeConfiguration<Quiz>
{
    public void Configure(EntityTypeBuilder<Quiz> builder)
    {
        builder.ToTable("quizzes");
        builder.HasKey(q => q.Id);
        builder.Property(q => q.Title).HasMaxLength(200).IsRequired();
        builder.HasIndex(q => q.EventId);
        builder.HasIndex(q => q.TenantId);
    }
}

public sealed class QuizQuestionConfiguration : IEntityTypeConfiguration<QuizQuestion>
{
    public void Configure(EntityTypeBuilder<QuizQuestion> builder)
    {
        builder.ToTable("quiz_questions");
        builder.HasKey(q => q.Id);
        builder.Property(q => q.Text).HasMaxLength(500).IsRequired();
        builder.Property(q => q.OptionsJson).HasColumnType("jsonb").IsRequired();
        builder.HasIndex(q => new { q.QuizId, q.Order });
        builder.HasIndex(q => q.TenantId);
    }
}

public sealed class QuizResultConfiguration : IEntityTypeConfiguration<QuizResult>
{
    public void Configure(EntityTypeBuilder<QuizResult> builder)
    {
        builder.ToTable("quiz_results");
        builder.HasKey(r => r.Id);
        builder.HasIndex(r => new { r.QuizId, r.ParticipantId }).IsUnique();
        builder.HasIndex(r => r.TenantId);
    }
}

public sealed class NetworkingContactConfiguration : IEntityTypeConfiguration<NetworkingContact>
{
    public void Configure(EntityTypeBuilder<NetworkingContact> builder)
    {
        builder.ToTable("networking_contacts");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.ContactName).HasMaxLength(400).IsRequired();
        builder.Property(c => c.ContactEmail).HasMaxLength(320);
        builder.HasIndex(c => new { c.OwnerParticipantId, c.ContactParticipantId }).IsUnique();
        builder.HasIndex(c => c.TenantId);
    }
}
