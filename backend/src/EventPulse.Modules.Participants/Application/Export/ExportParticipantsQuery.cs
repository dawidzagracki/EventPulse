using ClosedXML.Excel;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Export;

/// <summary>Builds an .xlsx export of all participants for an event (spec §5.3).</summary>
public sealed record ExportParticipantsQuery(Guid EventId) : IRequest<byte[]>;

public sealed class ExportParticipantsHandler : IRequestHandler<ExportParticipantsQuery, byte[]>
{
    private static readonly string[] Headers =
    [
        "Imię", "Nazwisko", "E-mail", "Telefon", "Firma", "Stanowisko",
        "Grupa", "Stolik", "Pokój", "Dieta", "Rozmiar koszulki", "Transfer",
        "Status", "Check-in", "Check-out", "Czas na wydarzeniu (min)",
    ];

    private readonly IAppDbContext _db;

    public ExportParticipantsHandler(IAppDbContext db) => _db = db;

    public async Task<byte[]> Handle(ExportParticipantsQuery request, CancellationToken cancellationToken)
    {
        var participants = await _db.Set<Participant>().AsNoTracking()
            .Where(p => p.EventId == request.EventId)
            .OrderBy(p => p.LastName).ThenBy(p => p.FirstName)
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Uczestnicy");

        for (var c = 0; c < Headers.Length; c++)
        {
            var cell = sheet.Cell(1, c + 1);
            cell.Value = Headers[c];
            cell.Style.Font.Bold = true;
        }

        var row = 2;
        foreach (var p in participants)
        {
            var minutes = p is { CheckedInAt: not null, CheckedOutAt: not null }
                ? (int)Math.Round((p.CheckedOutAt.Value - p.CheckedInAt.Value).TotalMinutes)
                : (int?)null;

            sheet.Cell(row, 1).Value = p.FirstName;
            sheet.Cell(row, 2).Value = p.LastName;
            sheet.Cell(row, 3).Value = p.Email;
            sheet.Cell(row, 4).Value = p.Phone ?? "";
            sheet.Cell(row, 5).Value = p.Company ?? "";
            sheet.Cell(row, 6).Value = p.Position ?? "";
            sheet.Cell(row, 7).Value = p.GroupName ?? "";
            sheet.Cell(row, 8).Value = p.TableName ?? "";
            sheet.Cell(row, 9).Value = p.RoomNumber ?? "";
            sheet.Cell(row, 10).Value = p.DietaryPreferences ?? "";
            sheet.Cell(row, 11).Value = p.ShirtSize ?? "";
            sheet.Cell(row, 12).Value = p.AirportTransfer ? "Tak" : "Nie";
            sheet.Cell(row, 13).Value = p.Status.ToString();
            sheet.Cell(row, 14).Value = p.CheckedInAt?.ToString("yyyy-MM-dd HH:mm") ?? "";
            sheet.Cell(row, 15).Value = p.CheckedOutAt?.ToString("yyyy-MM-dd HH:mm") ?? "";
            if (minutes is { } m)
            {
                sheet.Cell(row, 16).Value = m;
            }

            row++;
        }

        sheet.SheetView.FreezeRows(1);
        sheet.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }
}
