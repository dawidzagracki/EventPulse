using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddParticipants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "participants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    LastName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    Phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Company = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Position = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Language = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    GroupName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    TableName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    RoomNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AirportTransfer = table.Column<bool>(type: "boolean", nullable: false),
                    ArrivalTime = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    FlightNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DietaryPreferences = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    AccessToken = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_participants", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_participants_AccessToken",
                table: "participants",
                column: "AccessToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_participants_EventId_Email",
                table: "participants",
                columns: new[] { "EventId", "Email" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_participants_EventId_Status",
                table: "participants",
                columns: new[] { "EventId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_participants_TenantId",
                table: "participants",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "participants");
        }
    }
}
