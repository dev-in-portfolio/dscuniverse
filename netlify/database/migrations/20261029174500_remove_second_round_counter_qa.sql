-- Remove only the 16 known QA clicks made during the October 29 browser
-- verification rounds. Earlier user clicks and all later traffic are retained.
-- Abort cleanup (delete nothing) if the exact expected 2-per-action shape
-- is not present inside this closed test window.
WITH test_window AS (
  SELECT event_id, document_number, action
  FROM thought_experiment_clicks
  WHERE created_at > TIMESTAMPTZ '2026-10-29 17:33:23.938+00'
    AND created_at <= TIMESTAMPTZ '2026-10-29 17:44:11.818+00'
),
per_action AS (
  SELECT document_number, action, COUNT(*) AS n
  FROM test_window
  GROUP BY document_number, action
),
safe_to_clean AS (
  SELECT COUNT(*) = 8
         AND COALESCE(MIN(n), 0) = 2
         AND COALESCE(MAX(n), 0) = 2 AS approved
  FROM per_action
)
DELETE FROM thought_experiment_clicks AS clicks
WHERE clicks.event_id IN (SELECT event_id FROM test_window)
  AND (SELECT approved FROM safe_to_clean);
