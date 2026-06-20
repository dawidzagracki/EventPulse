# EventPulse API — multi-stage build (.NET 10)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore using central package management props + project graph.
COPY Directory.Build.props Directory.Packages.props ./
COPY src/ ./src/
RUN dotnet restore src/EventPulse.Api/EventPulse.Api.csproj

RUN dotnet publish src/EventPulse.Api/EventPulse.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
# curl is used by the container HEALTHCHECK (compose gates extra API replicas on api1 being healthy,
# which guarantees migrations ran exactly once before the others start serving).
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
HEALTHCHECK --interval=10s --timeout=4s --start-period=40s --retries=12 \
    CMD curl -fsS http://localhost:8080/health || exit 1
ENTRYPOINT ["dotnet", "EventPulse.Api.dll"]
