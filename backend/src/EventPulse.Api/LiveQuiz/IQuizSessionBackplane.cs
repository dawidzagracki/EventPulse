using EventPulse.Modules.Engagement;

namespace EventPulse.Api.LiveQuiz;

/// <summary>
/// Storage + per-quiz mutual exclusion for live quiz sessions. In-memory implementation
/// is used by default; if Redis is configured (ConnectionStrings:Redis), the Redis-backed
/// implementation takes over so sessions survive across web instances.
/// </summary>
public interface IQuizSessionBackplane
{
    Task<LiveQuizSnapshot?> GetAsync(Guid quizId, CancellationToken ct = default);
    Task SetAsync(Guid quizId, LiveQuizSnapshot snapshot, CancellationToken ct = default);
    Task RemoveAsync(Guid quizId, CancellationToken ct = default);
    Task<T> LockAsync<T>(Guid quizId, Func<Task<T>> action);
}
