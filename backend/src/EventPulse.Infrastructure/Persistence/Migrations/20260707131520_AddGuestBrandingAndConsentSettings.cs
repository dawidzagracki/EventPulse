using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGuestBrandingAndConsentSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AppUseBrandColors",
                table: "events",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "CompanyName",
                table: "events",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowPhotoConsent",
                table: "events",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AppUseBrandColors",
                table: "events");

            migrationBuilder.DropColumn(
                name: "CompanyName",
                table: "events");

            migrationBuilder.DropColumn(
                name: "ShowPhotoConsent",
                table: "events");
        }
    }
}
