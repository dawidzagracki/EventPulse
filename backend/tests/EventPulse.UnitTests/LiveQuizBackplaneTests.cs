using EventPulse.Api.LiveQuiz;
using EventPulse.Modules.Engagement;

namespace EventPulse.UnitTests;

/// <summary>
/// Proves that two LiveQuizRegistry instances sharing the same backplane see the
/// same session state — i.e. simulates the horizontal-scaling case where web
/// instance A handles "next question" but instance B serves the player's answer.
/// </summary>
public class LiveQuizBackplaneTests
{
    private static IReadOnlyList<LiveQuestion> Questions() => new[]
    {
        new LiveQuestion(Guid.NewGuid(), "Q1", new[] { "A", "B" }, CorrectIndex: 1),
    };

    [Fact]
    public async Task Two_registries_sharing_a_backplane_see_the_same_session()
    {
        var backplane = new InMemoryQuizSessionBackplane();
        var nodeA = new LiveQuizRegistry(backplane);
        var nodeB = new LiveQuizRegistry(backplane);
        var quizId = Guid.NewGuid();
        var player = Guid.NewGuid();

        // Node A starts the quiz and advances to question 0.
        await nodeA.StartAsync(quizId, "Q", Questions());
        await nodeA.MutateAsync(quizId, s => { s.RegisterPlayer(player, "Bob"); return 0; });
        await nodeA.MutateAsync(quizId, s => { s.Next(DateTimeOffset.UtcNow); return 0; });

        // Node B (different web instance) sees the player and the open question.
        var sessionB = await nodeB.GetAsync(quizId);
        Assert.NotNull(sessionB);
        Assert.Equal(0, sessionB!.CurrentIndex);
        Assert.Equal(1, sessionB.PlayerCount);

        // Node B records the answer — Node A then sees the resulting score.
        await nodeB.MutateAsync(quizId, s => s.Answer(player, 1, DateTimeOffset.UtcNow));
        var sessionA = await nodeA.GetAsync(quizId);
        Assert.NotNull(sessionA);
        Assert.True(sessionA!.ScoreOf(player) > 0);
    }

    [Fact]
    public async Task End_removes_the_session_from_the_backplane()
    {
        var backplane = new InMemoryQuizSessionBackplane();
        var registry = new LiveQuizRegistry(backplane);
        var quizId = Guid.NewGuid();

        await registry.StartAsync(quizId, "Q", Questions());
        Assert.NotNull(await registry.GetAsync(quizId));

        await registry.EndAsync(quizId);
        Assert.Null(await registry.GetAsync(quizId));
    }
}
