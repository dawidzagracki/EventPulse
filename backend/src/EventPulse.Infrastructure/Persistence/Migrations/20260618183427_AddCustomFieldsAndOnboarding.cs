using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomFieldsAndOnboarding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomFieldsJson",
                table: "participants",
                type: "character varying(8000)",
                maxLength: 8000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "OnboardingCompletedAt",
                table: "participants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "event_custom_fields",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    LabelPl = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    LabelEn = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    OptionsJson = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Required = table.Column<bool>(type: "boolean", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_custom_fields", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "event_onboarding_steps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    TitlePl = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TitleEn = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    BodyPl = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    BodyEn = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    RequireConfirm = table.Column<bool>(type: "boolean", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_onboarding_steps", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_event_custom_fields_EventId_Order",
                table: "event_custom_fields",
                columns: new[] { "EventId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_event_custom_fields_TenantId",
                table: "event_custom_fields",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_event_onboarding_steps_EventId_Order",
                table: "event_onboarding_steps",
                columns: new[] { "EventId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_event_onboarding_steps_TenantId",
                table: "event_onboarding_steps",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "event_custom_fields");

            migrationBuilder.DropTable(
                name: "event_onboarding_steps");

            migrationBuilder.DropColumn(
                name: "CustomFieldsJson",
                table: "participants");

            migrationBuilder.DropColumn(
                name: "OnboardingCompletedAt",
                table: "participants");
        }
    }
}
