using EventPulse.Modules.Identity.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventPulse.Infrastructure.Persistence.Configurations;

public sealed class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.ToTable("tenants");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Name).HasMaxLength(200).IsRequired();
        builder.Property(t => t.LogoUrl).HasMaxLength(2048);
    }
}

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).HasMaxLength(320).IsRequired();
        builder.Property(u => u.PasswordHash).HasMaxLength(200).IsRequired();
        builder.Property(u => u.DisplayName).HasMaxLength(200).IsRequired();
        builder.Property(u => u.Role).HasConversion<int>();

        builder.HasIndex(u => u.Email).IsUnique();
        builder.HasIndex(u => u.TenantId);
    }
}

public sealed class ClientUserConfiguration : IEntityTypeConfiguration<ClientUser>
{
    public void Configure(EntityTypeBuilder<ClientUser> builder)
    {
        builder.ToTable("client_users");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Email).HasMaxLength(320).IsRequired();
        builder.Property(c => c.PasswordHash).HasMaxLength(200);
        builder.Property(c => c.DisplayName).HasMaxLength(200).IsRequired();
        builder.Property(c => c.ActivationTokenHash).HasMaxLength(128);

        builder.HasIndex(c => c.Email).IsUnique();
        builder.HasIndex(c => c.TenantId);
        builder.Ignore(c => c.IsActivated);
    }
}

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("refresh_tokens");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.TokenHash).HasMaxLength(128).IsRequired();
        builder.Property(r => r.PrincipalType).HasConversion<int>();

        builder.HasIndex(r => r.TokenHash).IsUnique();
        builder.HasIndex(r => r.PrincipalId);
        builder.Ignore(r => r.IsActive);
    }
}
