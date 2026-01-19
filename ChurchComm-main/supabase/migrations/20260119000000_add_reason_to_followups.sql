-- Add reason column to follow_ups table
-- This stores the primary reason why a follow-up was created (from AI analysis)

ALTER TABLE public.follow_ups
ADD COLUMN reason TEXT;

COMMENT ON COLUMN public.follow_ups.reason IS 'The primary reason for this follow-up, typically extracted from AI call analysis.';
