-- Operator-run bootstrap for the selected database; never an app migration.
-- Apply as its owner with CREATEROLE. Install passwords separately, outside Git.
BEGIN;
CREATE ROLE hlog_metrics_exporter NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
CREATE ROLE hlog_metrics_collector NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1;
ALTER ROLE hlog_metrics_exporter SET statement_timeout = '3s';
ALTER ROLE hlog_metrics_exporter SET idle_in_transaction_session_timeout = '5s';
ALTER ROLE hlog_metrics_exporter SET default_transaction_read_only = on;
ALTER ROLE hlog_metrics_collector SET statement_timeout = '3s';
ALTER ROLE hlog_metrics_collector SET idle_in_transaction_session_timeout = '5s';
ALTER ROLE hlog_metrics_collector SET default_transaction_read_only = on;
-- PUBLIC TEMP permits temp-table DDL even when default_transaction_read_only is on.
DO $$ BEGIN
  EXECUTE format('REVOKE TEMPORARY, CREATE ON DATABASE %I FROM PUBLIC', current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO hlog_metrics_exporter, hlog_metrics_collector', current_database());
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA monitoring;
REVOKE ALL ON SCHEMA monitoring FROM PUBLIC;
CREATE VIEW monitoring.database_health AS
SELECT current_setting('max_connections')::int AS max_connections,
       (SELECT count(*) FROM pg_catalog.pg_locks WHERE NOT granted) AS waiting_locks,
       (SELECT coalesce(sum(numbackends), 0)::bigint FROM pg_catalog.pg_stat_database) AS connections;
REVOKE ALL ON monitoring.database_health FROM PUBLIC;
GRANT USAGE ON SCHEMA monitoring TO hlog_metrics_collector;
GRANT SELECT ON monitoring.database_health TO hlog_metrics_collector;
COMMIT;
