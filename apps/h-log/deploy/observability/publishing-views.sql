-- Apply as the app's table owner after migration 012 and database-roles.sql.
-- No raw IDs, text, provider names, or SQL are exposed through these views.
BEGIN;
CREATE OR REPLACE VIEW monitoring.publishing_jobs AS
SELECT j.status AS state, j.type AS job_type, j.importance, count(*) AS count
FROM public.publish_jobs j JOIN public.posts p ON p.id=j.post_id AND p.current_version_id=j.post_version_id
GROUP BY j.status,j.type,j.importance;
CREATE OR REPLACE VIEW monitoring.publishing_queue AS
SELECT kinds.importance,
  CASE WHEN count(j.id) FILTER (WHERE j.status IN ('queued','retrying'))=0 THEN 0
    ELSE extract(epoch FROM now()-min(j.enqueued_at) FILTER (WHERE j.status IN ('queued','retrying'))) END AS age,
  count(j.id) FILTER (WHERE j.status IN ('queued','retrying') AND j.enqueued_at IS NULL) AS unknown,
  count(j.id) FILTER (WHERE j.status='running' AND j.lease_expires_at<now()) AS expired
FROM (VALUES ('required'),('retryable')) AS kinds(importance)
LEFT JOIN (public.publish_jobs j JOIN public.posts p ON p.id=j.post_id AND p.current_version_id=j.post_version_id
  AND p.status IN ('publishing','verifying','published')) ON j.importance=kinds.importance
GROUP BY kinds.importance;
CREATE OR REPLACE VIEW monitoring.publishing_usage AS
WITH costs AS (
 SELECT coalesce(sum(estimated_cost),0) AS month_known,
 count(*) FILTER (WHERE estimated_cost IS NULL OR cost_basis IS NULL OR cost_basis='unknown') AS month_unknown,
 count(*) FILTER (WHERE cost_basis='included' AND estimated_cost IS NOT NULL) AS month_included,
 coalesce(sum(estimated_cost) FILTER (WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),0) AS day_known,
 count(*) FILTER (WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AND (estimated_cost IS NULL OR cost_basis IS NULL OR cost_basis='unknown')) AS day_unknown,
 count(*) FILTER (WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AND cost_basis='included' AND estimated_cost IS NOT NULL) AS day_included
 FROM public.usage_events WHERE created_at >= date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AND created_at <= now()
)
SELECT 'day' AS window, day_known AS known, day_unknown AS unknown, day_included AS included FROM costs
UNION ALL SELECT 'month',month_known,month_unknown,month_included FROM costs;
REVOKE ALL ON monitoring.publishing_jobs, monitoring.publishing_queue, monitoring.publishing_usage FROM PUBLIC;
GRANT SELECT ON monitoring.publishing_jobs, monitoring.publishing_queue, monitoring.publishing_usage TO hlog_metrics_collector;
COMMIT;
