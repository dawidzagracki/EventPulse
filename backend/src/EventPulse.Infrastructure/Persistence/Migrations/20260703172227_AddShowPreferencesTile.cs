using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddShowPreferencesTile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ShowPreferencesTile",
                table: "events",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShowPreferencesTile",
                table: "events");
        }
    }
}
