using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEventClientAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "event_client_assignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_client_assignments", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_event_client_assignments_ClientUserId",
                table: "event_client_assignments",
                column: "ClientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_event_client_assignments_EventId",
                table: "event_client_assignments",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_event_client_assignments_TenantId_EventId_ClientUserId",
                table: "event_client_assignments",
                columns: new[] { "TenantId", "EventId", "ClientUserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "event_client_assignments");
        }
    }
}
