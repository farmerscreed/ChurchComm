-- NOTE: grant_compliance_events table already exists in the database.
-- The guardian-webhook edge function uses grant_compliance_events (not compliance_events).
-- This migration is kept for documentation purposes only.

-- Create a view for backward compatibility if any code references compliance_events
CREATE OR REPLACE VIEW compliance_events AS
  SELECT id, org_id AS organization_id, event_type, severity,
         message AS detail, raw_payload AS metadata, created_at AS occurred_at, created_at
  FROM grant_compliance_events;
