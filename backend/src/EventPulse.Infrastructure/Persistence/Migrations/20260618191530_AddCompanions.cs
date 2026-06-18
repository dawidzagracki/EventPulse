using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "participants",
                type: "character varying(320)",
                maxLength: 320,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(320)",
                oldMaxLength: 320);

            migrationBuilder.AddColumn<int>(
                name: "Age",
                table: "participants",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ParentParticipantId",
                table: "participants",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_participants_ParentParticipantId",
                table: "participants",
                column: "ParentParticipantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_participants_ParentParticipantId",
                table: "participants");

            migrationBuilder.DropColumn(
                name: "Age",
                table: "participants");

            migrationBuilder.DropColumn(
                name: "ParentParticipantId",
                table: "participants");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "participants",
                type: "character varying(320)",
                maxLength: 320,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(320)",
                oldMaxLength: 320,
                oldNullable: true);
        }
    }
}
