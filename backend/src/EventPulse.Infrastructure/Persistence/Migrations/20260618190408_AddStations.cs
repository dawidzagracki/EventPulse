using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "stations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    NameEn = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Icon = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    ScanLimitPerParticipant = table.Column<int>(type: "integer", nullable: false),
                    CountsAsCheckIn = table.Column<bool>(type: "boolean", nullable: false),
                    AllowSelfScan = table.Column<bool>(type: "boolean", nullable: false),
                    Active = table.Column<bool>(type: "boolean", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_scan_events_EventId_ParticipantId_StationCode",
                table: "scan_events",
                columns: new[] { "EventId", "ParticipantId", "StationCode" });

            migrationBuilder.CreateIndex(
                name: "IX_stations_EventId_Order",
                table: "stations",
                columns: new[] { "EventId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_stations_TenantId",
                table: "stations",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "stations");

            migrationBuilder.DropIndex(
                name: "IX_scan_events_EventId_ParticipantId_StationCode",
                table: "scan_events");
        }
    }
}
