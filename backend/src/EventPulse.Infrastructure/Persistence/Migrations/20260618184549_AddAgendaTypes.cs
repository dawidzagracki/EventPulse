using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAgendaTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CustomTypeId",
                table: "agenda_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "agenda_types",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    NamePl = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    NameEn = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Color = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Icon = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_agenda_types", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_agenda_types_EventId_Order",
                table: "agenda_types",
                columns: new[] { "EventId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_agenda_types_TenantId",
                table: "agenda_types",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "agenda_types");

            migrationBuilder.DropColumn(
                name: "CustomTypeId",
                table: "agenda_items");
        }
    }
}
