-- Remove exactly the two diagnostic events generated while reproducing the
-- initial tracking defect. No other click events are affected.
DELETE FROM thought_experiment_clicks
WHERE event_id = 'd06cd242-2d0b-41c1-811c-40e08bbcffff'
  AND document_number = 1 AND action = 'view';

WITH observed_qa_event AS (
  SELECT event_id FROM thought_experiment_clicks
  WHERE document_number = 4 AND action = 'view'
    AND created_at >= TIMESTAMPTZ '2026-10-29 03:19:08+00'
    AND created_at < TIMESTAMPTZ '2026-10-29 03:19:13+00'
)
DELETE FROM thought_experiment_clicks
WHERE event_id IN (
  SELECT event_id FROM observed_qa_event
  WHERE (SELECT COUNT(*) FROM observed_qa_event) = 1
);
