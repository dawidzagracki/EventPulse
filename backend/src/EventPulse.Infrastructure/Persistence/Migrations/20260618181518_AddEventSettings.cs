using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEventSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowCompanions",
                table: "events",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "AnonymizeAfterDays",
                table: "events",
                type: "integer",
                nullable: false,
                defaultValue: 90);

            migrationBuilder.AddColumn<bool>(
                name: "AnonymizeEnabled",
                table: "events",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AnonymizedAt",
                table: "events",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomPhotosText",
                table: "events",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomPhotosUrl",
                table: "events",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxCompanions",
                table: "events",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "PhoneRequired",
                table: "events",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "UsesLocationData",
                table: "events",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowCompanions",
                table: "events");

            migrationBuilder.DropColumn(
                name: "AnonymizeAfterDays",
                table: "events");

            migrationBuilder.DropColumn(
                name: "AnonymizeEnabled",
                table: "events");

            migrationBuilder.DropColumn(
                name: "AnonymizedAt",
                table: "events");

            migrationBuilder.DropColumn(
                name: "CustomPhotosText",
                table: "events");

            migrationBuilder.DropColumn(
                name: "CustomPhotosUrl",
                table: "events");

            migrationBuilder.DropColumn(
                name: "MaxCompanions",
                table: "events");

            migrationBuilder.DropColumn(
                name: "PhoneRequired",
                table: "events");

            migrationBuilder.DropColumn(
                name: "UsesLocationData",
                table: "events");
        }
    }
}
