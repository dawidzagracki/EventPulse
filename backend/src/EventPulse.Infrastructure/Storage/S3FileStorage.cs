using Amazon.S3;
using Amazon.S3.Model;
using EventPulse.Shared.Storage;
using Microsoft.Extensions.Options;

namespace EventPulse.Infrastructure.Storage;

/// <summary>S3-compatible storage (MinIO locally, OVH Object Storage in production).</summary>
public sealed class S3FileStorage : IFileStorage, IDisposable
{
    private readonly IAmazonS3 _client;
    private readonly string _bucket;

    public S3FileStorage(IOptions<StorageOptions> options)
    {
        var o = options.Value;
        _bucket = o.Bucket;
        _client = new AmazonS3Client(
            o.AccessKey,
            o.SecretKey,
            new AmazonS3Config
            {
                ServiceURL = o.Endpoint,
                ForcePathStyle = o.ForcePathStyle,
                AuthenticationRegion = o.Region,
            });
    }

    public async Task UploadAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default)
    {
        await _client.PutObjectAsync(
            new PutObjectRequest
            {
                BucketName = _bucket,
                Key = key,
                InputStream = content,
                ContentType = contentType,
                AutoCloseStream = false,
            },
            cancellationToken);
    }

    public async Task<StoredFile> DownloadAsync(string key, CancellationToken cancellationToken = default)
    {
        var response = await _client.GetObjectAsync(_bucket, key, cancellationToken);
        return new StoredFile(response.ResponseStream, response.Headers.ContentType ?? "application/octet-stream");
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken = default)
        => _client.DeleteObjectAsync(_bucket, key, cancellationToken);

    public void Dispose() => _client.Dispose();
}
