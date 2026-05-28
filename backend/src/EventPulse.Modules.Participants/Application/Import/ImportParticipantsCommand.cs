using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Import;

/// <summary>
/// Parses an uploaded workbook and either previews (Commit=false) or imports (Commit=true) it.
/// The event's tenant ownership is validated by the controller before this runs.
/// </summary>
public sealed record ImportParticipantsCommand(Guid EventId, byte[] FileContent, bool Commit)
    : IRequest<ImportResultDto>;

public sealed record ImportResultDto(
    int TotalRows,
    int ValidRows,
    int ImportedCount,
    IReadOnlyList<RowError> Errors,
    IReadOnlyList<string> DuplicateEmails,
    bool Committed);

public sealed class ImportParticipantsHandler : IRequestHandler<ImportParticipantsCommand, ImportResultDto>
{
    private readonly IAppDbContext _db;

    public ImportParticipantsHandler(IAppDbContext db) => _db = db;

    public async Task<ImportResultDto> Handle(ImportParticipantsCommand request, CancellationToken cancellationToken)
    {
        using var stream = new MemoryStream(request.FileContent);
        var (rows, errors) = ExcelParticipantParser.Parse(stream);

        if (errors.Count > 0 && rows.Count == 0)
        {
            return new ImportResultDto(0, 0, 0, errors, [], Committed: false);
        }

        // Duplicates already present for this event.
        var existingEmails = await _db.Set<Participant>()
            .Where(p => p.EventId == request.EventId)
            .Select(p => p.Email)
            .ToListAsync(cancellationToken);
        var existing = existingEmails.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var duplicates = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var toImport = new List<ParticipantImportRow>();

        foreach (var row in rows)
        {
            if (existing.Contains(row.Email) || !seen.Add(row.Email))
            {
                duplicates.Add(row.Email);
                continue;
            }

            toImport.Add(row);
        }

        var imported = 0;
        if (request.Commit && toImport.Count > 0)
        {
            foreach (var row in toImport)
            {
                _db.Set<Participant>().Add(new Participant
                {
                    EventId = request.EventId,
                    FirstName = row.FirstName,
                    LastName = row.LastName,
                    Email = row.Email,
                    Phone = row.Phone,
                    Company = row.Company,
                    Position = row.Position,
                    Language = row.Language,
                    GroupName = row.GroupName,
                    TableName = row.TableName,
                    RoomNumber = row.RoomNumber,
                    AirportTransfer = row.AirportTransfer,
                    ArrivalTime = row.ArrivalTime,
                    FlightNumber = row.FlightNumber,
                    DietaryPreferences = row.DietaryPreferences,
                    Notes = row.Notes,
                    Status = ParticipantStatus.Invited,
                });
            }

            imported = await _db.SaveChangesAsync(cancellationToken);
            imported = toImport.Count;
        }

        return new ImportResultDto(
            TotalRows: rows.Count + errors.Count(e => e.RowNumber > 1),
            ValidRows: toImport.Count,
            ImportedCount: imported,
            Errors: errors,
            DuplicateEmails: duplicates.Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            Committed: request.Commit);
    }
}
