CREATE TABLE IF NOT EXISTS thought_experiment_clicks (
  event_id UUID PRIMARY KEY,
  document_number SMALLINT NOT NULL CHECK (document_number BETWEEN 1 AND 4),
  action TEXT NOT NULL CHECK (action IN ('view', 'download')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS thought_experiment_clicks_summary_idx
  ON thought_experiment_clicks (document_number, action);
