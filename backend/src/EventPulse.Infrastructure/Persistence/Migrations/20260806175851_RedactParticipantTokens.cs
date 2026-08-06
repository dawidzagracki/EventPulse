using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Second pass over the audit log, for the key the first one missed.
    ///
    /// <c>RedactAuditCredentials</c> matched exact property names and <c>BatchScanCommand</c> calls
    /// its field <c>ParticipantToken</c>, so every scan ever recorded kept a guest's access token —
    /// the payload of their QR code — in clear text. Same reasoning as before: masked on purpose,
    /// not recoverable, <c>Down</c> empty. The scan itself is unaffected; <c>scan_events</c> holds
    /// the real record and keys on ParticipantId.
    ///
    /// No schema change. Keys mirror AuditRedactor.Sensitive; keep the two in step.
    /// </summary>
    public partial class RedactParticipantTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE OR REPLACE FUNCTION ep_audit_redact(payload jsonb) RETURNS jsonb AS $fn$
                DECLARE
                    result jsonb;
                    item_key text;
                    item_value jsonb;
                BEGIN
                    IF payload IS NULL THEN
                        RETURN NULL;
                    END IF;

                    IF jsonb_typeof(payload) = 'object' THEN
                        result := '{}'::jsonb;
                        FOR item_key, item_value IN SELECT * FROM jsonb_each(payload) LOOP
                            IF lower(item_key) = ANY (ARRAY[
                                'password', 'newpassword', 'currentpassword', 'confirmpassword',
                                'token', 'accesstoken', 'refreshtoken', 'participanttoken',
                                'secret', 'clientsecret', 'apikey'
                            ]) AND jsonb_typeof(item_value) <> 'null' THEN
                                result := result || jsonb_build_object(item_key, '***');
                            ELSE
                                result := result || jsonb_build_object(item_key, ep_audit_redact(item_value));
                            END IF;
                        END LOOP;
                        RETURN result;
                    END IF;

                    IF jsonb_typeof(payload) = 'array' THEN
                        SELECT coalesce(jsonb_agg(ep_audit_redact(element)), '[]'::jsonb)
                        INTO result
                        FROM jsonb_array_elements(payload) AS element;
                        RETURN result;
                    END IF;

                    RETURN payload;
                END;
                $fn$ LANGUAGE plpgsql;
                """);

            // Only rows that still carry one, so this is cheap and re-runnable.
            migrationBuilder.Sql(
                """
                UPDATE audit_logs
                SET "Payload" = ep_audit_redact("Payload")
                WHERE "Payload"::text ILIKE '%participanttoken%';
                """);

            migrationBuilder.Sql("DROP FUNCTION ep_audit_redact(jsonb);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty — the tokens this removed are gone on purpose.
        }
    }
}
