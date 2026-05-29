using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Commands;

public sealed record UpdateParticipantLogisticsCommand(
    Guid Id,
    string? GroupName,
    string? TableName,
    string? RoomNumber,
    string? HotelName,
    string? HotelAddress,
    string? HotelPhone) : IRequest<ParticipantDto>;

public sealed class UpdateParticipantLogisticsHandler(IAppDbContext db)
    : IRequestHandler<UpdateParticipantLogisticsCommand, ParticipantDto>
{
    public async Task<ParticipantDto> Handle(UpdateParticipantLogisticsCommand request, CancellationToken ct)
    {
        var p = await db.Set<Participant>().FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Participant not found.");

        p.GroupName = request.GroupName;
        p.TableName = request.TableName;
        p.RoomNumber = request.RoomNumber;
        p.HotelName = request.HotelName;
        p.HotelAddress = request.HotelAddress;
        p.HotelPhone = request.HotelPhone;

        await db.SaveChangesAsync(ct);
        return ParticipantDto.From(p);
    }
}
