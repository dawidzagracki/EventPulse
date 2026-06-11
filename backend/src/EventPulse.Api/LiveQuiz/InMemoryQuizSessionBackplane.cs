using System.Collections.Concurrent;
using EventPulse.Modules.Engagement;

namespace EventPulse.Api.LiveQuiz;

/// <summary>Single-instance backplane: state lives in this process; locks via SemaphoreSlim.</summary>
public sealed class InMemoryQuizSessionBackplane : IQuizSessionBackplane
{
    private readonly ConcurrentDictionary<Guid, LiveQuizSnapshot> _store = new();
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _locks = new();

    public Task<LiveQuizSnapshot?> GetAsync(Guid quizId, CancellationToken ct = default)
        => Task.FromResult(_store.GetValueOrDefault(quizId));

    public Task SetAsync(Guid quizId, LiveQuizSnapshot snapshot, CancellationToken ct = default)
    {
        _store[quizId] = snapshot;
        return Task.CompletedTask;
    }

    public Task RemoveAsync(Guid quizId, CancellationToken ct = default)
    {
        _store.TryRemove(quizId, out _);
        _locks.TryRemove(quizId, out _);
        return Task.CompletedTask;
    }

    public async Task<T> LockAsync<T>(Guid quizId, Func<Task<T>> action)
    {
        var sem = _locks.GetOrAdd(quizId, _ => new SemaphoreSlim(1, 1));
        await sem.WaitAsync();
        try { return await action(); }
        finally { sem.Release(); }
    }
}
