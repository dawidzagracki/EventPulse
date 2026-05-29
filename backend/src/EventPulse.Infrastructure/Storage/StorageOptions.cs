namespace EventPulse.Infrastructure.Storage;

public sealed class StorageOptions
{
    public const string SectionName = "Storage";

    public string Endpoint { get; set; } = "http://localhost:9000";
    public string AccessKey { get; set; } = "minioadmin";
    public string SecretKey { get; set; } = "minioadmin";
    public string Bucket { get; set; } = "eventpulse";
    public bool ForcePathStyle { get; set; } = true;
    public string Region { get; set; } = "us-east-1";
}
