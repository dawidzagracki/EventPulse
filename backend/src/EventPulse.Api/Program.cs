using System.Text;
using System.Threading.RateLimiting;
using EventPulse.Api.Hubs;
using EventPulse.Api.Infrastructure;
using EventPulse.Api.Middleware;
using EventPulse.Infrastructure;
using EventPulse.Infrastructure.Email;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Infrastructure.Storage;
using EventPulse.Modules.Ai;
using EventPulse.Modules.Identity;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Shared.Application;
using EventPulse.Shared.Notifications;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("Missing connection string 'ConnectionStrings:Postgres'.");

builder.Services.AddInfrastructure(connectionString);
builder.Services.AddEmail(builder.Configuration);
builder.Services.AddStorage(builder.Configuration);
builder.Services.AddIdentityModule(builder.Configuration);
builder.Services.AddAiModule(builder.Configuration);

// Module assemblies that contain MediatR handlers and FluentValidation validators.
var moduleAssemblies = new[]
{
    typeof(EventPulse.Modules.Identity.DependencyInjection).Assembly,
    typeof(EventPulse.Modules.Events.Domain.Event).Assembly,
    typeof(EventPulse.Modules.Participants.Domain.Participant).Assembly,
    typeof(EventPulse.Modules.Agenda.Domain.AgendaItem).Assembly,
    typeof(EventPulse.Modules.Content.Domain.EventPage).Assembly,
    typeof(EventPulse.Modules.Scanning.Domain.ScanEvent).Assembly,
    typeof(EventPulse.Modules.Logistics.Transfer).Assembly,
    typeof(EventPulse.Modules.Engagement.Contest).Assembly,
    typeof(EventPulse.Modules.Gallery.Photo).Assembly,
    typeof(EventPulse.Modules.Ai.ChatCommand).Assembly,
};

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpContextCurrentUser>();

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssemblies(moduleAssemblies);
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
    cfg.AddOpenBehavior(typeof(AuditLoggingBehavior<,>));
});
builder.Services.AddValidatorsFromAssemblies(moduleAssemblies);

// JWT authentication. Validation params are bound from IOptions<JwtOptions> (resolved at runtime)
// so they always match the key TokenService signs with — even when config is overridden in tests.
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>>((bearer, jwtOptions) =>
    {
        var jwt = jwtOptions.Value;
        bearer.MapInboundClaims = false; // keep JWT claim names (sub, email, role) as-is
        bearer.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "sub",
            RoleClaimType = AppClaims.Role,
        };

        // SignalR WebSockets can't set the Authorization header — read the token from the query string.
        bearer.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthPolicies.Agency, p => p.RequireClaim(AppClaims.PrincipalType, "Agency"));
    options.AddPolicy(AuthPolicies.Client, p => p.RequireClaim(AppClaims.PrincipalType, "Client"));
    options.AddPolicy(AuthPolicies.Participant, p => p.RequireClaim(AppClaims.PrincipalType, "Participant"));
    options.AddPolicy(AuthPolicies.AgencyOrClient, p => p.RequireClaim(AppClaims.PrincipalType, "Agency", "Client"));
});

const string CorsPolicy = "frontend";
builder.Services.AddCors(options => options.AddPolicy(CorsPolicy, policy =>
    policy
        .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"])
        .AllowAnyHeader()
        .AllowAnyMethod()));

var signalr = builder.Services.AddSignalR();
var redis = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrWhiteSpace(redis))
{
    signalr.AddStackExchangeRedis(redis); // backplane for horizontal scaling
}

builder.Services.AddScoped<IEventNotifier, SignalREventNotifier>();

// Live quiz sessions live in-process (singleton registry) and broadcast over QuizHub.
builder.Services.AddSingleton<EventPulse.Api.LiveQuiz.LiveQuizRegistry>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Per-IP global cap.
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 300, Window = TimeSpan.FromMinutes(1) }));

    // Stricter limiter for auth endpoints (anti brute-force).
    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<AppExceptionHandler>();

var app = builder.Build();

await DevDataSeeder.MigrateAndSeedAsync(app.Services, seedDevData: app.Environment.IsDevelopment());

app.UseExceptionHandler();

// Security headers (HSTS/TLS terminate at the reverse proxy in production).
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["X-XSS-Protection"] = "0";
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(CorsPolicy);
if (!app.Environment.IsDevelopment())
{
    app.UseRateLimiter(); // enforced in staging/prod; off locally and in tests
}

app.UseAuthentication();
app.UseMiddleware<TenantResolutionMiddleware>(); // after auth: principal is populated
app.UseAuthorization();

app.MapControllers();
app.MapHub<EventHub>("/hubs/event");
app.MapHub<QuizHub>("/hubs/quiz");

app.MapGet("/health", async (AppDbContext db, CancellationToken ct) =>
{
    var canConnect = await db.Database.CanConnectAsync(ct);
    return canConnect
        ? Results.Ok(new { status = "healthy" })
        : Results.Json(new { status = "unhealthy" }, statusCode: StatusCodes.Status503ServiceUnavailable);
});

app.Run();

/// <summary>Exposed so integration tests can spin up the host via WebApplicationFactory.</summary>
public partial class Program;
