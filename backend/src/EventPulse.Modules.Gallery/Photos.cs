using EventPulse.Shared.Application;
using EventPulse.Shared.Domain;
using EventPulse.Shared.Persistence;
using EventPulse.Shared.Storage;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Modules.Gallery;

public sealed class Photo : TenantEntity
{
    public Guid EventId { get; set; }
    public required string StorageKey { get; set; }
    public required string ContentType { get; set; }
    public required string FileName { get; set; }

    /// <summary>Manual moderation flag (consent-based gallery, no ML). Only published photos are shown to participants.</summary>
    public bool Published { get; set; } = true;

    public DateTimeOffset UploadedAt { get; set; }
}

public sealed record PhotoDto(Guid Id, string FileName, string ContentType, bool Published, DateTimeOffset UploadedAt)
{
    public static PhotoDto From(Photo p) => new(p.Id, p.FileName, p.ContentType, p.Published, p.UploadedAt);
}

public sealed record UploadPhotoCommand(Guid EventId, string FileName, string ContentType, byte[] Content)
    : IRequest<PhotoDto>;

public sealed class UploadPhotoHandler(IAppDbContext db, IFileStorage storage) : IRequestHandler<UploadPhotoCommand, PhotoDto>
{
    public async Task<PhotoDto> Handle(UploadPhotoCommand request, CancellationToken ct)
    {
        var photo = new Photo
        {
            EventId = request.EventId,
            ContentType = request.ContentType,
            FileName = request.FileName,
            StorageKey = $"events/{request.EventId}/gallery/{Guid.CreateVersion7()}",
            UploadedAt = DateTimeOffset.UtcNow,
        };

        using (var stream = new MemoryStream(request.Content))
        {
            await storage.UploadAsync(photo.StorageKey, stream, request.ContentType, ct);
        }

        db.Set<Photo>().Add(photo);
        await db.SaveChangesAsync(ct);
        return PhotoDto.From(photo);
    }
}

public sealed record ListPhotosQuery(Guid EventId, bool OnlyPublished) : IRequest<IReadOnlyList<PhotoDto>>;

public sealed class ListPhotosHandler(IAppDbContext db) : IRequestHandler<ListPhotosQuery, IReadOnlyList<PhotoDto>>
{
    public async Task<IReadOnlyList<PhotoDto>> Handle(ListPhotosQuery request, CancellationToken ct)
    {
        var query = db.Set<Photo>().AsNoTracking().Where(p => p.EventId == request.EventId);
        if (request.OnlyPublished)
        {
            query = query.Where(p => p.Published);
        }

        var rows = await query.OrderByDescending(p => p.UploadedAt).ToListAsync(ct);
        return rows.Select(PhotoDto.From).ToList();
    }
}

public sealed record GetPhotoFileQuery(Guid Id, bool RequirePublished) : IRequest<StoredFile>;

public sealed class GetPhotoFileHandler(IAppDbContext db, IFileStorage storage) : IRequestHandler<GetPhotoFileQuery, StoredFile>
{
    public async Task<StoredFile> Handle(GetPhotoFileQuery request, CancellationToken ct)
    {
        var photo = await db.Set<Photo>().AsNoTracking().FirstOrDefaultAsync(p => p.Id == request.Id, ct)
            ?? throw new NotFoundException("Photo not found.");

        if (request.RequirePublished && !photo.Published)
        {
            throw new NotFoundException("Photo not available.");
        }

        return await storage.DownloadAsync(photo.StorageKey, ct);
    }
}

public sealed record DeletePhotoCommand(Guid Id) : IRequest;

public sealed class DeletePhotoHandler(IAppDbContext db, IFileStorage storage) : IRequestHandler<DeletePhotoCommand>
{
    public async Task Handle(DeletePhotoCommand request, CancellationToken ct)
    {
        var photo = await db.Set<Photo>().FirstOrDefaultAsync(p => p.Id == request.Id, ct)
            ?? throw new NotFoundException("Photo not found.");

        await storage.DeleteAsync(photo.StorageKey, ct);
        db.Set<Photo>().Remove(photo);
        await db.SaveChangesAsync(ct);
    }
}
