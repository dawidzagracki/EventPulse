using System.Text;
using EventPulse.Modules.Agenda.Domain;
using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Ai;

public sealed record ChatCommand(Guid ParticipantId, Guid EventId, string Message) : IRequest<string>;

public sealed class ChatHandler(IAppDbContext db, IAiAssistant assistant) : IRequestHandler<ChatCommand, string>
{
    public async Task<string> Handle(ChatCommand request, CancellationToken ct)
    {
        var participant = await db.Set<Participant>().AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.ParticipantId, ct)
            ?? throw new NotFoundException("Participant not found.");

        var agenda = await db.Set<AgendaItem>().AsNoTracking()
            .Where(a => a.EventId == request.EventId
                        && (a.GroupName == null || a.GroupName == participant.GroupName))
            .OrderBy(a => a.StartsAt)
            .ToListAsync(ct);

        var system = BuildSystemPrompt(participant, agenda);
        return await assistant.AnswerAsync(system, request.Message, ct);
    }

    private static string BuildSystemPrompt(Participant p, IReadOnlyList<AgendaItem> agenda)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Jesteś asystentem uczestnika wydarzenia EventPulse. Odpowiadaj zwięźle i konkretnie,")
          .AppendLine($"w języku uczestnika ({p.Language}). Korzystaj wyłącznie z poniższych danych:");

        sb.AppendLine().AppendLine("PROFIL UCZESTNIKA:");
        sb.AppendLine($"- Imię: {p.FirstName} {p.LastName}");
        if (p.GroupName is not null) sb.AppendLine($"- Grupa: {p.GroupName}");
        if (p.TableName is not null) sb.AppendLine($"- Stolik: {p.TableName}");
        if (p.RoomNumber is not null) sb.AppendLine($"- Pokój: {p.RoomNumber}");
        if (p.HotelName is not null) sb.AppendLine($"- Hotel: {p.HotelName} ({p.HotelAddress})");
        if (p.HotelPhone is not null) sb.AppendLine($"- Recepcja: {p.HotelPhone}");
        if (p.AirportTransfer) sb.AppendLine($"- Transfer z lotniska: tak, przylot {p.ArrivalTime}, lot {p.FlightNumber}");
        if (p.DietaryPreferences is not null) sb.AppendLine($"- Preferencje żywieniowe: {p.DietaryPreferences}");

        sb.AppendLine().AppendLine("AGENDA:");
        foreach (var item in agenda)
        {
            sb.AppendLine($"- {item.StartsAt:g}–{item.EndsAt:t} {item.TitlePl}"
                + (item.LocationName is not null ? $" @ {item.LocationName}" : string.Empty)
                + (item.Menu is not null ? $" · menu: {item.Menu}" : string.Empty));
        }

        sb.AppendLine().AppendLine("Jeśli pytanie wykracza poza powyższe — uprzejmie odmów i skieruj do organizatora.");
        return sb.ToString();
    }
}
