using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Events.Domain;
using NetArchTest.Rules;

namespace EventPulse.ArchitectureTests;

/// <summary>Keeps dependencies pointing inward so modules stay decoupled and the host stays at the edge.</summary>
public class DependencyRuleTests
{
    [Fact]
    public void Infrastructure_should_not_depend_on_the_api_host()
    {
        var result = Types.InAssembly(typeof(AppDbContext).Assembly)
            .ShouldNot()
            .HaveDependencyOn("EventPulse.Api")
            .GetResult();

        Assert.True(result.IsSuccessful, Describe(result));
    }

    [Fact]
    public void Modules_should_not_depend_on_infrastructure()
    {
        var result = Types.InAssembly(typeof(Event).Assembly)
            .ShouldNot()
            .HaveDependencyOn("EventPulse.Infrastructure")
            .GetResult();

        Assert.True(result.IsSuccessful, Describe(result));
    }

    private static string Describe(TestResult result) =>
        result.IsSuccessful
            ? string.Empty
            : "Offending types: " + string.Join(", ", result.FailingTypeNames);
}
