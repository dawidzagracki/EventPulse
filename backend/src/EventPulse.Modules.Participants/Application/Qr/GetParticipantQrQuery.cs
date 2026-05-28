using EventPulse.Modules.Participants.Domain;
using EventPulse.Shared.Application;
using EventPulse.Shared.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Participants.Application.Qr;

/// <summary>Returns the participant's QR code PNG encoding their token login link.</summary>
public sealed record GetParticipantQrQuery(Guid Id, string LinkBaseUrl) : IRequest<byte[]>;

public sealed class GetParticipantQrHandler : IRequestHandler<GetParticipantQrQuery, byte[]>
{
    private readonly IAppDbContext _db;

    public GetParticipantQrHandler(IAppDbContext db) => _db = db;

    public async Task<byte[]> Handle(GetParticipantQrQuery request, CancellationToken cancellationToken)
    {
        var participant = await _db.Set<Participant>().AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Participant not found.");

        var link = $"{request.LinkBaseUrl.TrimEnd('/')}/{participant.AccessToken}";
        return QrImage.GeneratePng(link);
    }
}
