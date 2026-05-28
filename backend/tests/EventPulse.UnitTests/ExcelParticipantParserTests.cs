using ClosedXML.Excel;
using EventPulse.Modules.Participants.Application.Import;

namespace EventPulse.UnitTests;

public class ExcelParticipantParserTests
{
    private static byte[] BuildWorkbook(IEnumerable<string[]> dataRows, bool correctHeaders = true)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Uczestnicy");

        for (var c = 0; c < ImportSchema.Headers.Length; c++)
        {
            sheet.Cell(1, c + 1).Value = correctHeaders ? ImportSchema.Headers[c] : $"Wrong{c}";
        }

        var r = 2;
        foreach (var row in dataRows)
        {
            for (var c = 0; c < row.Length; c++)
            {
                sheet.Cell(r, c + 1).Value = row[c] ?? string.Empty;
            }

            r++;
        }

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    [Fact]
    public void Parses_valid_rows()
    {
        var bytes = BuildWorkbook(
        [
            ["Anna", "Kowalska", "anna@example.com", "+48500100200", "ACME", "CEO", "EN", "Grupa A", "5", "312", "TAK", "14:30", "LO245", "wegańskie", "VIP"],
            ["Jan", "Nowak", "jan@example.com", "", "", "", "", "", "", "", "NIE", "", "", "", ""],
        ]);

        using var stream = new MemoryStream(bytes);
        var (rows, errors) = ExcelParticipantParser.Parse(stream);

        Assert.Empty(errors);
        Assert.Equal(2, rows.Count);

        var anna = rows[0];
        Assert.Equal("anna@example.com", anna.Email);
        Assert.Equal("en", anna.Language);
        Assert.True(anna.AirportTransfer);
        Assert.Equal("LO245", anna.FlightNumber);

        Assert.False(rows[1].AirportTransfer);
        Assert.Equal("pl", rows[1].Language); // default
    }

    [Fact]
    public void Reports_row_errors_for_missing_and_invalid_email()
    {
        var bytes = BuildWorkbook(
        [
            ["Anna", "Kowalska", "", .. new string[12]],          // missing email
            ["Jan", "Nowak", "not-an-email", .. new string[12]],  // invalid email
        ]);

        using var stream = new MemoryStream(bytes);
        var (rows, errors) = ExcelParticipantParser.Parse(stream);

        Assert.Empty(rows);
        Assert.Equal(2, errors.Count);
        Assert.Contains(errors, e => e.RowNumber == 2 && e.Message.Contains("brak emaila"));
        Assert.Contains(errors, e => e.RowNumber == 3 && e.Message.Contains("nieprawidłowy email"));
    }

    [Fact]
    public void Rejects_file_with_wrong_headers()
    {
        var bytes = BuildWorkbook([], correctHeaders: false);

        using var stream = new MemoryStream(bytes);
        var (rows, errors) = ExcelParticipantParser.Parse(stream);

        Assert.Empty(rows);
        Assert.NotEmpty(errors);
        Assert.All(errors, e => Assert.Equal(1, e.RowNumber));
    }
}
