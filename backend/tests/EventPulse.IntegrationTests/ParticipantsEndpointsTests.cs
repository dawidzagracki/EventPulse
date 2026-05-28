using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ClosedXML.Excel;
using EventPulse.Modules.Participants.Application.Import;

namespace EventPulse.IntegrationTests;

public class ParticipantsEndpointsTests : IClassFixture<ApiFactory>
{
    private const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly ApiFactory _factory;

    public ParticipantsEndpointsTests(ApiFactory factory) => _factory = factory;

    private async Task<HttpClient> AdminClientAsync()
    {
        var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = "admin@falp.local", password = "Admin123!" });
        login.EnsureSuccessStatusCode();
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization = new("Bearer", tokens.GetProperty("accessToken").GetString());
        return client;
    }

    private async Task<Guid> CreateEventAsync(HttpClient client)
    {
        var resp = await client.PostAsJsonAsync("/api/events", new
        {
            name = $"Event {Guid.NewGuid():N}",
            startsAt = DateTimeOffset.UtcNow.AddDays(10),
            endsAt = DateTimeOffset.UtcNow.AddDays(11),
            defaultLanguage = "pl",
        });
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static byte[] BuildWorkbook(params string[][] rows)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Uczestnicy");
        for (var c = 0; c < ImportSchema.Headers.Length; c++)
        {
            sheet.Cell(1, c + 1).Value = ImportSchema.Headers[c];
        }

        var r = 2;
        foreach (var row in rows)
        {
            for (var c = 0; c < row.Length; c++)
            {
                sheet.Cell(r, c + 1).Value = row[c] ?? string.Empty;
            }

            r++;
        }

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    private static MultipartFormDataContent FilePart(byte[] xlsx)
    {
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(xlsx);
        file.Headers.ContentType = new MediaTypeHeaderValue(XlsxContentType);
        content.Add(file, "file", "uczestnicy.xlsx");
        return content;
    }

    [Fact]
    public async Task Template_download_returns_xlsx()
    {
        var client = await AdminClientAsync();
        var eventId = await CreateEventAsync(client);

        var resp = await client.GetAsync($"/api/events/{eventId}/participants/template");

        resp.EnsureSuccessStatusCode();
        Assert.Equal(XlsxContentType, resp.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Import_commit_then_list_and_qr()
    {
        var client = await AdminClientAsync();
        var eventId = await CreateEventAsync(client);

        var xlsx = BuildWorkbook(
            ["Anna", "Kowalska", "anna@x.com", "", "", "", "EN", "", "", "", "TAK", "", "", "", ""],
            ["Jan", "Nowak", "jan@x.com", .. new string[12]]);

        using var form = FilePart(xlsx);
        var import = await client.PostAsync($"/api/events/{eventId}/participants/import?commit=true", form);
        import.EnsureSuccessStatusCode();
        var result = await import.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, result.GetProperty("importedCount").GetInt32());
        Assert.True(result.GetProperty("committed").GetBoolean());

        var list = await client.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}/participants");
        Assert.Equal(2, list.GetArrayLength());

        var participantId = list[0].GetProperty("id").GetGuid();
        var qr = await client.GetAsync($"/api/events/{eventId}/participants/{participantId}/qr");
        qr.EnsureSuccessStatusCode();
        Assert.Equal("image/png", qr.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Import_preview_reports_errors_without_committing()
    {
        var client = await AdminClientAsync();
        var eventId = await CreateEventAsync(client);

        var xlsx = BuildWorkbook(
            ["Anna", "Kowalska", "anna@x.com", .. new string[12]],
            ["", "", "bademail", .. new string[12]]); // invalid row

        using var form = FilePart(xlsx);
        var preview = await client.PostAsync($"/api/events/{eventId}/participants/import?commit=false", form);
        preview.EnsureSuccessStatusCode();
        var result = await preview.Content.ReadFromJsonAsync<JsonElement>();

        Assert.False(result.GetProperty("committed").GetBoolean());
        Assert.Equal(0, result.GetProperty("importedCount").GetInt32());
        Assert.Equal(1, result.GetProperty("validRows").GetInt32());
        Assert.True(result.GetProperty("errors").GetArrayLength() >= 1);

        // Nothing persisted on preview.
        var list = await client.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}/participants");
        Assert.Equal(0, list.GetArrayLength());
    }
}
