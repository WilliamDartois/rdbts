-- Minimal additive migration for mobile idempotency.
-- Apply after the supplied real schema_postgres.sql; does not recreate or replace tables.
ALTER TABLE workout
  ADD COLUMN IF NOT EXISTS client_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workout_user_client_id
  ON workout (user_id, client_id)
  WHERE client_id IS NOT NULL;
