using ClosedXML.Excel;

namespace EventPulse.Modules.Participants.Application.Import;

/// <summary>Produces the blank .xlsx template (header row only) for clients to fill in.</summary>
public static class ImportTemplate
{
    public static byte[] Build()
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Uczestnicy");

        for (var c = 0; c < ImportSchema.Headers.Length; c++)
        {
            var cell = sheet.Cell(1, c + 1);
            cell.Value = ImportSchema.Headers[c];
            cell.Style.Font.Bold = true;
        }

        sheet.SheetView.FreezeRows(1);
        sheet.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }
}
