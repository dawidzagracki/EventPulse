using System.Security.Claims;
using EventPulse.Api.LiveQuiz;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Participants.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace EventPulse.Api.Hubs;

/// <summary>
/// Real-time channel for a live "Kahoot" quiz. Participants join a quiz group to
/// receive questions/reveals (pushed by the host via LiveQuizController) and
/// submit answers here. The host controls progression over REST.
/// </summary>
[Authorize]
public sealed class QuizHub : Hub
{
    private readonly LiveQuizRegistry _registry;
    private readonly IServiceScopeFactory _scopes;

    public QuizHub(LiveQuizRegistry registry, IServiceScopeFactory scopes)
    {
        _registry = registry;
        _scopes = scopes;
    }

    public static string Group(Guid quizId) => $"quiz-{quizId}";

    private Guid? ParticipantId =>
        Guid.TryParse(Context.User?.FindFirstValue("sub"), out var id) ? id : null;

    public async Task JoinQuiz(string quizId)
    {
        if (!Guid.TryParse(quizId, out var id)) return;
        await Groups.AddToGroupAsync(Context.ConnectionId, Group(id));

        var session = await _registry.GetAsync(id);
        if (session is not null && ParticipantId is { } pid)
        {
            var name = await LookupNameAsync(pid);
            var (updated, _) = await _registry.MutateAsync(id, s =>
            {
                s.RegisterPlayer(pid, name);
                return 0;
            });
            session = updated;
        }

        await Clients.Caller.SendAsync("state", new
        {
            started = session is not null,
            title = session?.Title,
            index = session?.CurrentIndex ?? -1,
            questionCount = session?.QuestionCount ?? 0,
            finished = session?.Finished ?? false,
        });
    }

    public async Task SubmitAnswer(string quizId, int optionIndex)
    {
        if (!Guid.TryParse(quizId, out var id)) return;
        if (ParticipantId is not { } pid) return;

        try
        {
            var (session, accepted) = await _registry.MutateAsync(id, s =>
                s.Answer(pid, optionIndex, DateTimeOffset.UtcNow));

            if (accepted)
            {
                await Clients.Group(Group(id)).SendAsync("answerCount", session.AnsweredCount, session.PlayerCount);
            }
        }
        catch (InvalidOperationException)
        {
            // Session ended between Join and answer — silently drop, the client UI handles "finished".
        }
    }

    private async Task<string> LookupNameAsync(Guid participantId)
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var p = await db.Set<Participant>().AsNoTracking().IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.Id == participantId);
        return p is null ? "Gość" : $"{p.FirstName} {p.LastName}".Trim();
    }
}
