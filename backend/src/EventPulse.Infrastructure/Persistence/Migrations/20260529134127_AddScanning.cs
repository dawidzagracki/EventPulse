using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddScanning : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CheckedInAt",
                table: "participants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CheckedOutAt",
                table: "participants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "scan_events",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    ParticipantId = table.Column<Guid>(type: "uuid", nullable: false),
                    StationCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    OccurredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Online = table.Column<bool>(type: "boolean", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scan_events", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_scan_events_ClientId",
                table: "scan_events",
                column: "ClientId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_scan_events_EventId",
                table: "scan_events",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_scan_events_ParticipantId",
                table: "scan_events",
                column: "ParticipantId");

            migrationBuilder.CreateIndex(
                name: "IX_scan_events_TenantId",
                table: "scan_events",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "scan_events");

            migrationBuilder.DropColumn(
                name: "CheckedInAt",
                table: "participants");

            migrationBuilder.DropColumn(
                name: "CheckedOutAt",
                table: "participants");
        }
    }
}
