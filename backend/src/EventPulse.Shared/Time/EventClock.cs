namespace EventPulse.Shared.Time;

/// <summary>
/// Converts stored instants (UTC <see cref="DateTimeOffset"/>s coming back from Postgres
/// <c>timestamptz</c>) into the event's local wall-clock time for display in e-mails.
/// Events are Polish, so the local zone is Europe/Warsaw; resolution falls back gracefully
/// (IANA id → Windows id → UTC) so a misconfigured host can never crash a send.
/// </summary>
public static class EventClock
{
    private static readonly TimeZoneInfo Local = Resolve();

    private static TimeZoneInfo Resolve()
    {
        foreach (var id in new[] { "Europe/Warsaw", "Central European Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        return TimeZoneInfo.Utc;
    }

    /// <summary>The instant expressed in the event's local time zone (Europe/Warsaw).</summary>
    public static DateTimeOffset ToEventLocal(DateTimeOffset value) => TimeZoneInfo.ConvertTime(value, Local);
}
