namespace EventPulse.Shared.Storage;

public sealed record StoredFile(Stream Content, string ContentType);

/// <summary>Object storage seam. Local: MinIO. Prod: OVH Object Storage (both S3-compatible).</summary>
public interface IFileStorage
{
    Task UploadAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default);

    Task<StoredFile> DownloadAsync(string key, CancellationToken cancellationToken = default);

    Task DeleteAsync(string key, CancellationToken cancellationToken = default);
}
