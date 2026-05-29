using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEngagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "contest_results",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContestId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParticipantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Score = table.Column<double>(type: "double precision", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contest_results", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "contests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Mode = table.Column<int>(type: "integer", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "networking_contacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerParticipantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContactParticipantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContactName = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    ContactEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_networking_contacts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "quiz_questions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuizId = table.Column<Guid>(type: "uuid", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    Text = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    OptionsJson = table.Column<string>(type: "jsonb", nullable: false),
                    CorrectIndex = table.Column<int>(type: "integer", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quiz_questions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "quiz_results",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuizId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParticipantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    Total = table.Column<int>(type: "integer", nullable: false),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quiz_results", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "quizzes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quizzes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_contest_results_ContestId_ParticipantId",
                table: "contest_results",
                columns: new[] { "ContestId", "ParticipantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_contest_results_TenantId",
                table: "contest_results",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_contests_EventId",
                table: "contests",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_contests_TenantId",
                table: "contests",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_networking_contacts_OwnerParticipantId_ContactParticipantId",
                table: "networking_contacts",
                columns: new[] { "OwnerParticipantId", "ContactParticipantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_networking_contacts_TenantId",
                table: "networking_contacts",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_questions_QuizId_Order",
                table: "quiz_questions",
                columns: new[] { "QuizId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_quiz_questions_TenantId",
                table: "quiz_questions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_results_QuizId_ParticipantId",
                table: "quiz_results",
                columns: new[] { "QuizId", "ParticipantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_quiz_results_TenantId",
                table: "quiz_results",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_quizzes_EventId",
                table: "quizzes",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_quizzes_TenantId",
                table: "quizzes",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "contest_results");

            migrationBuilder.DropTable(
                name: "contests");

            migrationBuilder.DropTable(
                name: "networking_contacts");

            migrationBuilder.DropTable(
                name: "quiz_questions");

            migrationBuilder.DropTable(
                name: "quiz_results");

            migrationBuilder.DropTable(
                name: "quizzes");
        }
    }
}
