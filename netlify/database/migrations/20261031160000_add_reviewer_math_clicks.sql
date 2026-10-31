-- Add the reviewer math ZIP as research item 5 without changing any existing click records.
ALTER TABLE thought_experiment_clicks
  DROP CONSTRAINT IF EXISTS thought_experiment_clicks_document_number_check;

ALTER TABLE thought_experiment_clicks
  ADD CONSTRAINT thought_experiment_clicks_document_number_check
  CHECK (document_number BETWEEN 1 AND 5);
