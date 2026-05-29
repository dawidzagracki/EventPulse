using System.Text;
using EventPulse.Api.Infrastructure;
using EventPulse.Api.Middleware;
using EventPulse.Infrastructure;
using EventPulse.Infrastructure.Email;
using EventPulse.Infrastructure.Persistence;
using EventPulse.Modules.Identity;
using EventPulse.Modules.Identity.Auth;
using EventPulse.Shared.Application;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("Missing connection string 'ConnectionStrings:Postgres'.");

builder.Services.AddInfrastructure(connectionString);
builder.Services.AddEmail(builder.Configuration);
builder.Services.AddIdentityModule(builder.Configuration);

// Module assemblies that contain MediatR handlers and FluentValidation validators.
var moduleAssemblies = new[]
{
    typeof(EventPulse.Modules.Identity.DependencyInjection).Assembly,
    typeof(EventPulse.Modules.Events.Domain.Event).Assembly,
    typeof(EventPulse.Modules.Participants.Domain.Participant).Assembly,
    typeof(EventPulse.Modules.Agenda.Domain.AgendaItem).Assembly,
    typeof(EventPulse.Modules.Content.Domain.EventPage).Assembly,
};

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssemblies(moduleAssemblies);
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
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

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<AppExceptionHandler>();

var app = builder.Build();

await DevDataSeeder.MigrateAndSeedAsync(app.Services, seedDevData: app.Environment.IsDevelopment());

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseMiddleware<TenantResolutionMiddleware>(); // after auth: principal is populated
app.UseAuthorization();

app.MapControllers();

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
