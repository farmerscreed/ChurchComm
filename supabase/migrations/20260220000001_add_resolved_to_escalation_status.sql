-- Migration: Add 'resolved' to escalation_status enum
-- This value is used by the UI when marking escalation_alerts.status as resolved.
-- vapi_call_logs.escalation_status is TEXT (not this enum) so it is unaffected.

ALTER TYPE public.escalation_status ADD VALUE IF NOT EXISTS 'resolved';
