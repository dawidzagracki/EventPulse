using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPulse.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Scrubs credentials out of audit rows written before <c>AuditRedactor</c> existed.
    ///
    /// The behaviour serialised whole commands, so every sign-in stored its password in clear text
    /// and every participant login stored the access token behind that guest's QR code. Masking them
    /// is the point of this migration: the values are deliberately destroyed and cannot be restored.
    /// Nothing else in the row is touched — actor, action and timestamp all survive, so the trail
    /// still says who did what and when.
    ///
    /// No schema change. The key list mirrors AuditRedactor.Sensitive; keep the two in step.
    /// </summary>
    public partial class RedactAuditCredentials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Recursive, because a command can nest objects and arrays. plpgsql rather than SQL:
            // a plain SQL function cannot call itself at creation time.
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
                                'token', 'accesstoken', 'refreshtoken',
                                'secret', 'clientsecret', 'apikey'
                            ]) AND jsonb_typeof(item_value) <> 'null' THEN
                                -- A null means "not supplied" (e.g. password left unchanged); keep it.
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

            migrationBuilder.Sql(
                """
                UPDATE audit_logs
                SET "Payload" = ep_audit_redact("Payload")
                WHERE "Payload" IS NOT NULL;
                """);

            // One-shot helper — nothing should be able to call it afterwards.
            migrationBuilder.Sql("DROP FUNCTION ep_audit_redact(jsonb);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty. The passwords and tokens this removed are gone on purpose;
            // rolling back must not — and cannot — bring them back.
        }
    }
}
