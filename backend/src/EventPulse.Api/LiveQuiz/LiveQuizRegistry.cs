using System.Collections.Concurrent;
using EventPulse.Modules.Engagement;

namespace EventPulse.Api.LiveQuiz;

/// <summary>Process-wide store of running live quiz sessions, keyed by quiz id.</summary>
public sealed class LiveQuizRegistry
{
    private readonly ConcurrentDictionary<Guid, LiveQuizSession> _sessions = new();

    public LiveQuizSession Start(Guid quizId, string title, IReadOnlyList<LiveQuestion> questions)
    {
        var session = new LiveQuizSession(quizId, title, questions);
        _sessions[quizId] = session;
        return session;
    }

    public LiveQuizSession? Get(Guid quizId) => _sessions.GetValueOrDefault(quizId);

    public void End(Guid quizId) => _sessions.TryRemove(quizId, out _);
}
