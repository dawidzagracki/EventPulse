using EventPulse.Modules.Engagement;

namespace EventPulse.UnitTests;

/// <summary>Spec §2.8: scoring rewards correctness + reaction speed; one answer per question.</summary>
public class LiveQuizSessionTests
{
    private static LiveQuizSession MakeSession() => new(
        Guid.NewGuid(),
        "Quiz",
        new[]
        {
            new LiveQuestion(Guid.NewGuid(), "Q1", new[] { "A", "B", "C" }, CorrectIndex: 1),
            new LiveQuestion(Guid.NewGuid(), "Q2", new[] { "X", "Y" }, CorrectIndex: 0),
        });

    [Fact]
    public void Faster_correct_answer_scores_more_than_slower_correct_answer()
    {
        var session = MakeSession();
        var fast = Guid.NewGuid();
        var slow = Guid.NewGuid();
        session.RegisterPlayer(fast, "Fast");
        session.RegisterPlayer(slow, "Slow");

        var t0 = new DateTimeOffset(2026, 6, 1, 12, 0, 0, TimeSpan.Zero);
        session.Next(t0);

        Assert.True(session.Answer(fast, 1, t0.AddSeconds(1)));
        Assert.True(session.Answer(slow, 1, t0.AddSeconds(10)));

        Assert.True(session.ScoreOf(fast) > session.ScoreOf(slow));
    }

    [Fact]
    public void Wrong_answer_scores_zero_and_one_answer_per_question()
    {
        var session = MakeSession();
        var p = Guid.NewGuid();
        session.RegisterPlayer(p, "P");

        var t0 = DateTimeOffset.UtcNow;
        session.Next(t0);

        Assert.True(session.Answer(p, 0, t0.AddSeconds(2))); // wrong
        Assert.False(session.Answer(p, 1, t0.AddSeconds(3))); // can't change
        Assert.Equal(0, session.ScoreOf(p));
    }

    [Fact]
    public void Finishes_after_last_question_and_keeps_leaderboard()
    {
        var session = MakeSession();
        var p = Guid.NewGuid();
        session.RegisterPlayer(p, "Winner");
        var t0 = DateTimeOffset.UtcNow;

        session.Next(t0);
        session.Answer(p, 1, t0.AddSeconds(2)); // correct
        session.Next(t0.AddSeconds(20));
        session.Answer(p, 0, t0.AddSeconds(22)); // correct
        session.Next(t0.AddSeconds(40)); // past last → finished

        Assert.True(session.Finished);
        var board = session.Leaderboard();
        Assert.Single(board);
        Assert.Equal("Winner", board[0].Name);
        Assert.True(board[0].Score > 0);
    }

    [Fact]
    public void Cannot_answer_after_reveal()
    {
        var session = MakeSession();
        var p = Guid.NewGuid();
        session.RegisterPlayer(p, "P");
        var t0 = DateTimeOffset.UtcNow;

        session.Next(t0);
        session.Reveal();
        Assert.False(session.Answer(p, 1, t0.AddSeconds(1)));
    }
}
