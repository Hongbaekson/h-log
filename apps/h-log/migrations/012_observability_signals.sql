-- Preserve unknown enqueue times on old rows; only future inserts get a default.
ALTER TABLE publish_jobs ADD COLUMN enqueued_at timestamptz;
ALTER TABLE publish_jobs ALTER COLUMN enqueued_at SET DEFAULT clock_timestamp();
ALTER TABLE usage_events ADD COLUMN cost_basis text
  CHECK (cost_basis IN ('estimated', 'included', 'unknown'));
CREATE INDEX usage_events_created_at_idx ON usage_events(created_at);
