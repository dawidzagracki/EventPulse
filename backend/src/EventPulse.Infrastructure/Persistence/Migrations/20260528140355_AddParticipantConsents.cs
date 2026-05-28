using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddParticipantConsents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "NetworkingConsent",
                table: "participants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "PhotoConsent",
                table: "participants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PreferencesSubmittedAt",
                table: "participants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RodoAcceptedAt",
                table: "participants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RodoVersion",
                table: "participants",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShirtSize",
                table: "participants",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Wishes",
                table: "participants",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NetworkingConsent",
                table: "participants");

            migrationBuilder.DropColumn(
                name: "PhotoConsent",
                table: "participants");

            migrationBuilder.DropColumn(
                name: "PreferencesSubmittedAt",
                table: "participants");

            migrationBuilder.DropColumn(
                name: "RodoAcceptedAt",
                table: "participants");

            migrationBuilder.DropColumn(
                name: "RodoVersion",
                table: "participants");

            migrationBuilder.DropColumn(
                name: "ShirtSize",
                table: "participants");

            migrationBuilder.DropColumn(
                name: "Wishes",
                table: "participants");
        }
    }
}
