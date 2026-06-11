using System.Text.Json;
using EventPulse.Modules.Engagement;
using StackExchange.Redis;

namespace EventPulse.Api.LiveQuiz;

/// <summary>
/// Redis-backed backplane so live quiz sessions survive across multiple web instances.
/// Sessions auto-expire after the TTL so a crashed host doesn't leak keys forever.
/// </summary>
public sealed class RedisQuizSessionBackplane : IQuizSessionBackplane
{
    private static readonly TimeSpan SessionTtl = TimeSpan.FromHours(6);
    private static readonly TimeSpan LockTtl = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan LockPollInterval = TimeSpan.FromMilliseconds(25);
    private static readonly TimeSpan LockAcquireTimeout = TimeSpan.FromSeconds(5);

    private readonly IConnectionMultiplexer _redis;

    public RedisQuizSessionBackplane(IConnectionMultiplexer redis) => _redis = redis;

    private static string SessionKey(Guid quizId) => $"eventpulse:livequiz:{quizId:N}";
    private static string LockKey(Guid quizId) => $"eventpulse:livequiz-lock:{quizId:N}";

    public async Task<LiveQuizSnapshot?> GetAsync(Guid quizId, CancellationToken ct = default)
    {
        var value = await _redis.GetDatabase().StringGetAsync(SessionKey(quizId));
        return value.IsNullOrEmpty ? null : JsonSerializer.Deserialize<LiveQuizSnapshot>((string)value!);
    }

    public async Task SetAsync(Guid quizId, LiveQuizSnapshot snapshot, CancellationToken ct = default)
    {
        var json = JsonSerializer.Serialize(snapshot);
        await _redis.GetDatabase().StringSetAsync(SessionKey(quizId), json, SessionTtl);
    }

    public async Task RemoveAsync(Guid quizId, CancellationToken ct = default)
        => await _redis.GetDatabase().KeyDeleteAsync(SessionKey(quizId));

    public async Task<T> LockAsync<T>(Guid quizId, Func<Task<T>> action)
    {
        var db = _redis.GetDatabase();
        var token = Guid.NewGuid().ToString("N");
        var key = LockKey(quizId);
        var deadline = DateTimeOffset.UtcNow + LockAcquireTimeout;

        while (!await db.StringSetAsync(key, token, LockTtl, When.NotExists))
        {
            if (DateTimeOffset.UtcNow > deadline)
                throw new TimeoutException($"Timed out waiting for live quiz lock on {quizId}.");
            await Task.Delay(LockPollInterval);
        }

        try { return await action(); }
        finally
        {
            // Release the lock only if we still own it. Lua so the check + delete is atomic.
            const string releaseScript = """
                if redis.call('get', KEYS[1]) == ARGV[1] then
                    return redis.call('del', KEYS[1])
                else
                    return 0
                end
                """;
            await db.ScriptEvaluateAsync(releaseScript, [key], [token]);
        }
    }
}
