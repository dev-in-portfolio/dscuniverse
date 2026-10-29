-- The post-fix UI verification created one View and one Download click on
-- Document 2. Remove only the unique events in the exact observed windows;
-- if either window contains more than one event, leave it untouched.
WITH qa_view AS (
  SELECT event_id FROM thought_experiment_clicks
  WHERE document_number = 2 AND action = 'view'
    AND created_at >= TIMESTAMPTZ '2026-10-29 03:24:01+00'
    AND created_at < TIMESTAMPTZ '2026-10-29 03:24:04+00'
)
DELETE FROM thought_experiment_clicks
WHERE event_id IN (
  SELECT event_id FROM qa_view WHERE (SELECT COUNT(*) FROM qa_view) = 1
);

WITH qa_download AS (
  SELECT event_id FROM thought_experiment_clicks
  WHERE document_number = 2 AND action = 'download'
    AND created_at >= TIMESTAMPTZ '2026-10-29 03:24:07+00'
    AND created_at < TIMESTAMPTZ '2026-10-29 03:24:10+00'
)
DELETE FROM thought_experiment_clicks
WHERE event_id IN (
  SELECT event_id FROM qa_download WHERE (SELECT COUNT(*) FROM qa_download) = 1
);
