namespace EventPulse.Modules.Engagement;

/// <summary>A question as broadcast during a live quiz (correct index kept server-side).</summary>
public sealed record LiveQuestion(Guid Id, string Text, IReadOnlyList<string> Options, int CorrectIndex);

public sealed record LeaderboardEntry(string Name, int Score);

/// <summary>
/// In-memory state for one host-controlled "Kahoot" quiz session (spec §2.8):
/// the host advances questions, everyone answers simultaneously, and scoring
/// rewards both correctness and reaction speed. Pure logic — unit-testable
/// without SignalR.
/// </summary>
public sealed class LiveQuizSession
{
    public const double QuestionWindowSeconds = 20;
    private const int BasePoints = 500;
    private const int SpeedPoints = 500;

    private readonly IReadOnlyList<LiveQuestion> _questions;
    private readonly Dictionary<Guid, string> _names = new();
    private readonly Dictionary<Guid, int> _scores = new();
    private readonly HashSet<Guid> _answeredThisQuestion = [];

    public LiveQuizSession(Guid quizId, string title, IReadOnlyList<LiveQuestion> questions)
    {
        QuizId = quizId;
        Title = title;
        _questions = questions;
    }

    public Guid QuizId { get; }
    public string Title { get; }
    public int QuestionCount => _questions.Count;

    /// <summary>-1 = lobby (not started). Equals QuestionCount when finished.</summary>
    public int CurrentIndex { get; private set; } = -1;
    public bool Revealed { get; private set; }
    public bool Finished => CurrentIndex >= _questions.Count && CurrentIndex >= 0;
    public DateTimeOffset? QuestionStartedAt { get; private set; }
    public int PlayerCount => _names.Count;
    public int AnsweredCount => _answeredThisQuestion.Count;

    public LiveQuestion? Current =>
        CurrentIndex >= 0 && CurrentIndex < _questions.Count ? _questions[CurrentIndex] : null;

    public void RegisterPlayer(Guid participantId, string name)
    {
        if (_names.TryAdd(participantId, name))
        {
            _scores[participantId] = 0;
        }
    }

    /// <summary>Advances to the next question (or into the finished state). Clears per-question answers.</summary>
    public void Next(DateTimeOffset now)
    {
        CurrentIndex++;
        Revealed = false;
        _answeredThisQuestion.Clear();
        QuestionStartedAt = CurrentIndex < _questions.Count ? now : null;
    }

    public void Reveal() => Revealed = true;

    /// <summary>
    /// Records a participant's answer. One answer per question; correct answers
    /// earn base points plus a speed bonus that decays over the question window.
    /// Returns true if the answer was accepted.
    /// </summary>
    public bool Answer(Guid participantId, int optionIndex, DateTimeOffset now)
    {
        if (Revealed || Current is null) return false;
        if (!_names.ContainsKey(participantId)) return false;
        if (!_answeredThisQuestion.Add(participantId)) return false; // already answered

        if (optionIndex == Current.CorrectIndex)
        {
            var elapsed = (now - (QuestionStartedAt ?? now)).TotalSeconds;
            var speed = Math.Clamp(1 - elapsed / QuestionWindowSeconds, 0, 1);
            _scores[participantId] += BasePoints + (int)Math.Round(SpeedPoints * speed);
        }

        return true;
    }

    public IReadOnlyList<LeaderboardEntry> Leaderboard(int take = 20) =>
        _names.Keys
            .Select(id => new LeaderboardEntry(_names[id], _scores[id]))
            .OrderByDescending(e => e.Score)
            .Take(take)
            .ToList();

    public int ScoreOf(Guid participantId) => _scores.GetValueOrDefault(participantId);

    /// <summary>Per-participant final scores, for persistence to QuizResult.</summary>
    public IReadOnlyList<(Guid ParticipantId, int Score)> Results() =>
        _names.Keys.Select(id => (id, _scores[id])).ToList();
}
