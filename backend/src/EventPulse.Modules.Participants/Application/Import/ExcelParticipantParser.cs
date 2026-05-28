using System.Net.Mail;
using ClosedXML.Excel;

namespace EventPulse.Modules.Participants.Application.Import;

/// <summary>Reads and validates the participant import workbook into typed rows + per-row errors.</summary>
public static class ExcelParticipantParser
{
    public static (List<ParticipantImportRow> Rows, List<RowError> Errors) Parse(Stream stream)
    {
        var rows = new List<ParticipantImportRow>();
        var errors = new List<RowError>();

        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.FirstOrDefault();
        if (sheet is null)
        {
            errors.Add(new RowError(0, "Plik nie zawiera arkusza."));
            return (rows, errors);
        }

        for (var c = 0; c < ImportSchema.Headers.Length; c++)
        {
            var actual = sheet.Cell(1, c + 1).GetString().Trim();
            if (!string.Equals(actual, ImportSchema.Headers[c], StringComparison.OrdinalIgnoreCase))
            {
                errors.Add(new RowError(1,
                    $"Nieprawidłowy nagłówek w kolumnie {c + 1}: oczekiwano '{ImportSchema.Headers[c]}', jest '{actual}'."));
            }
        }

        if (errors.Count > 0)
        {
            return (rows, errors); // header mismatch: refuse the whole file
        }

        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
        if (lastRow - 1 > ImportSchema.MaxRows)
        {
            errors.Add(new RowError(0, $"Za dużo wierszy ({lastRow - 1}). Maksymalnie {ImportSchema.MaxRows}."));
            return (rows, errors);
        }

        for (var r = 2; r <= lastRow; r++)
        {
            string Cell(int col) => sheet.Cell(r, col).GetString().Trim();

            var first = Cell(1);
            var last = Cell(2);
            var email = Cell(3).ToLowerInvariant();

            var allEmpty = Enumerable.Range(1, ImportSchema.Headers.Length).All(c => Cell(c).Length == 0);
            if (allEmpty)
            {
                continue; // ignore blank rows
            }

            var rowProblems = new List<string>();
            if (first.Length == 0)
            {
                rowProblems.Add("brak imienia");
            }

            if (last.Length == 0)
            {
                rowProblems.Add("brak nazwiska");
            }

            if (email.Length == 0)
            {
                rowProblems.Add("brak emaila");
            }
            else if (!IsValidEmail(email))
            {
                rowProblems.Add("nieprawidłowy email");
            }

            if (rowProblems.Count > 0)
            {
                errors.Add(new RowError(r, string.Join(", ", rowProblems)));
                continue;
            }

            rows.Add(new ParticipantImportRow
            {
                RowNumber = r,
                FirstName = first,
                LastName = last,
                Email = email,
                Phone = NullIfEmpty(Cell(4)),
                Company = NullIfEmpty(Cell(5)),
                Position = NullIfEmpty(Cell(6)),
                Language = NormalizeLanguage(Cell(7)),
                GroupName = NullIfEmpty(Cell(8)),
                TableName = NullIfEmpty(Cell(9)),
                RoomNumber = NullIfEmpty(Cell(10)),
                AirportTransfer = ParseYesNo(Cell(11)),
                ArrivalTime = NullIfEmpty(Cell(12)),
                FlightNumber = NullIfEmpty(Cell(13)),
                DietaryPreferences = NullIfEmpty(Cell(14)),
                Notes = NullIfEmpty(Cell(15)),
            });
        }

        return (rows, errors);
    }

    private static string? NullIfEmpty(string value) => value.Length == 0 ? null : value;

    private static string NormalizeLanguage(string value) =>
        value.Equals("en", StringComparison.OrdinalIgnoreCase) ? "en" : "pl";

    private static bool ParseYesNo(string value) =>
        value.Equals("TAK", StringComparison.OrdinalIgnoreCase) || value.Equals("YES", StringComparison.OrdinalIgnoreCase);

    private static bool IsValidEmail(string email) => MailAddress.TryCreate(email, out _);
}
