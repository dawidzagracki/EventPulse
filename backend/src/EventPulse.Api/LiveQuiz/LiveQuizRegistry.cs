using EventPulse.Modules.Engagement;

namespace EventPulse.Api.LiveQuiz;

/// <summary>
/// Stores running live quiz sessions and applies mutations under a per-quiz lock.
/// Backed by either an in-memory store (single instance) or Redis (horizontal scaling).
/// </summary>
public sealed class LiveQuizRegistry
{
    private readonly IQuizSessionBackplane _backplane;

    public LiveQuizRegistry(IQuizSessionBackplane backplane) => _backplane = backplane;

    public async Task<LiveQuizSession> StartAsync(Guid quizId, string title, IReadOnlyList<LiveQuestion> questions, CancellationToken ct = default)
    {
        var session = new LiveQuizSession(quizId, title, questions);
        await _backplane.SetAsync(quizId, session.ToSnapshot(), ct);
        return session;
    }

    public async Task<LiveQuizSession?> GetAsync(Guid quizId, CancellationToken ct = default)
    {
        var snap = await _backplane.GetAsync(quizId, ct);
        return snap is null ? null : LiveQuizSession.FromSnapshot(snap);
    }

    public Task EndAsync(Guid quizId, CancellationToken ct = default) => _backplane.RemoveAsync(quizId, ct);

    /// <summary>
    /// Locks the session, applies <paramref name="mutate"/>, persists the result, and returns the
    /// post-mutation session along with whatever value the caller produced.
    /// </summary>
    public async Task<(LiveQuizSession Session, T Value)> MutateAsync<T>(
        Guid quizId, Func<LiveQuizSession, T> mutate, CancellationToken ct = default)
    {
        return await _backplane.LockAsync(quizId, async () =>
        {
            var snap = await _backplane.GetAsync(quizId, ct)
                ?? throw new InvalidOperationException($"Quiz session {quizId} not started.");
            var session = LiveQuizSession.FromSnapshot(snap);
            var value = mutate(session);
            await _backplane.SetAsync(quizId, session.ToSnapshot(), ct);
            return (session, value);
        });
    }
}
