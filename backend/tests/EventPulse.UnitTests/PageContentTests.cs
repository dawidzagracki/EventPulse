using System.Text.Json;
using EventPulse.Modules.Content.Domain;

namespace EventPulse.UnitTests;

public class CssSanitizerTests
{
    [Theory]
    [InlineData("a{background:expression(alert(1))}", "expression(")]
    [InlineData("a{background:url(javascript:alert(1))}", "javascript:")]
    [InlineData("@import url('evil.css'); a{color:red}", "@import")]
    [InlineData("a{behavior:url(x.htc)}", "behavior:")]
    public void Removes_dangerous_tokens(string css, string forbidden)
    {
        var sanitized = CssSanitizer.Sanitize(css);
        Assert.DoesNotContain(forbidden, sanitized, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Keeps_safe_css()
    {
        const string css = "a{color:#fff;padding:8px}";
        Assert.Equal(css, CssSanitizer.Sanitize(css));
    }
}

public class PageContentTests
{
    [Fact]
    public void Rejects_invalid_json()
        => Assert.Throws<PageContent.InvalidPageContentException>(() => PageContent.ValidateAndSanitize("{not json"));

    [Fact]
    public void Rejects_missing_blocks_array()
        => Assert.Throws<PageContent.InvalidPageContentException>(() => PageContent.ValidateAndSanitize("""{"foo":1}"""));

    [Fact]
    public void Sanitizes_custom_css_inside_blocks()
    {
        const string input = """
            {"blocks":[{"type":"hero","styles":{"customCSS":"h1{background:expression(alert(1))}"}}]}
            """;

        var result = PageContent.ValidateAndSanitize(input);

        using var doc = JsonDocument.Parse(result);
        var css = doc.RootElement.GetProperty("blocks")[0].GetProperty("styles").GetProperty("customCSS").GetString();
        Assert.DoesNotContain("expression(", css, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Accepts_empty_page()
        => Assert.Equal(PageContent.Empty, PageContent.ValidateAndSanitize(PageContent.Empty));
}
