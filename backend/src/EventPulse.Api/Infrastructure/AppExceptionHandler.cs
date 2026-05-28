using EventPulse.Shared.Application;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace EventPulse.Api.Infrastructure;

/// <summary>Translates application and validation exceptions into RFC7807 ProblemDetails responses.</summary>
public sealed class AppExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetails;
    private readonly ILogger<AppExceptionHandler> _logger;

    public AppExceptionHandler(IProblemDetailsService problemDetails, ILogger<AppExceptionHandler> logger)
    {
        _problemDetails = problemDetails;
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var problem = new ProblemDetails();
        IDictionary<string, string[]>? errors = null;

        switch (exception)
        {
            case ValidationException validation:
                problem.Status = StatusCodes.Status400BadRequest;
                problem.Title = "Validation failed.";
                errors = validation.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
                break;

            case AppException app:
                problem.Status = app.StatusCode;
                problem.Title = app.Message;
                break;

            default:
                _logger.LogError(exception, "Unhandled exception");
                problem.Status = StatusCodes.Status500InternalServerError;
                problem.Title = "An unexpected error occurred.";
                break;
        }

        httpContext.Response.StatusCode = problem.Status!.Value;
        if (errors is not null)
        {
            problem.Extensions["errors"] = errors;
        }

        return await _problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception,
        });
    }
}
