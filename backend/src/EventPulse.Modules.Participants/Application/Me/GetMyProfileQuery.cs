using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Me;

public sealed record GetMyProfileQuery(Guid ParticipantId) : IRequest<MyProfileDto>;

public sealed class GetMyProfileHandler : IRequestHandler<GetMyProfileQuery, MyProfileDto>
{
    private readonly IAppDbContext _db;

    public GetMyProfileHandler(IAppDbContext db) => _db = db;

    public async Task<MyProfileDto> Handle(GetMyProfileQuery request, CancellationToken cancellationToken)
    {
        var participant = await _db.Set<Participant>().AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.ParticipantId, cancellationToken)
            ?? throw new NotFoundException("Participant not found.");

        return MyProfileDto.From(participant);
    }
}
