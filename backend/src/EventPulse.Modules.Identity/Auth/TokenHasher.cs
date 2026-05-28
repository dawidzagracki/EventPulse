using System.Security.Cryptography;
using System.Text;

namespace EventPulse.Modules.Identity.Auth;

/// <summary>Generates opaque refresh-token secrets and hashes them for at-rest storage.</summary>
public static class TokenHasher
{
    public static string NewSecret(int byteLength = 32)
    {
        var bytes = RandomNumberGenerator.GetBytes(byteLength);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    public static string Hash(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hash);
    }
}
