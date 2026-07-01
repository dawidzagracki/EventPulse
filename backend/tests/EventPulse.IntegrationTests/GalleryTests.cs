using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace EventPulse.IntegrationTests;

public class GalleryTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public GalleryTests(ApiFactory factory) => _factory = factory;

    private async Task<HttpClient> AdminAsync()
    {
        var c = _factory.CreateClient();
        var login = await c.PostAsJsonAsync("/api/auth/login", new { email = "admin@falp.local", password = "Admin123!" });
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>();
        c.DefaultRequestHeaders.Authorization = new("Bearer", tokens.GetProperty("accessToken").GetString());
        return c;
    }

    [Fact]
    public async Task Upload_list_and_download_photo()
    {
        var admin = await AdminAsync();
        var eventId = (await (await admin.PostAsJsonAsync("/api/events", new
        {
            name = $"Gal {Guid.NewGuid():N}",
            clientEmail = "klient@test.local",
            startsAt = DateTimeOffset.UtcNow,
            endsAt = DateTimeOffset.UtcNow.AddHours(2),
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var bytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 1, 2, 3, 4, 5 }; // fake PNG header + data
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(file, "file", "photo.png");

        var upload = await admin.PostAsync($"/api/events/{eventId}/gallery", form);
        upload.EnsureSuccessStatusCode();
        var photo = await upload.Content.ReadFromJsonAsync<JsonElement>();
        var photoId = photo.GetProperty("id").GetGuid();

        var list = await admin.GetFromJsonAsync<JsonElement>($"/api/events/{eventId}/gallery");
        Assert.Equal(1, list.GetArrayLength());

        var download = await admin.GetAsync($"/api/events/{eventId}/gallery/{photoId}/file");
        download.EnsureSuccessStatusCode();
        Assert.Equal("image/png", download.Content.Headers.ContentType?.MediaType);
        Assert.Equal(bytes, await download.Content.ReadAsByteArrayAsync());
    }
}
