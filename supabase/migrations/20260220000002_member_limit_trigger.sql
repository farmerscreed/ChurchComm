-- Migration: Enforce member limits per subscription plan
-- Fires BEFORE INSERT on people table to prevent exceeding plan limits.

CREATE OR REPLACE FUNCTION public.enforce_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_plan    TEXT;
  current_cnt INTEGER;
  max_members INTEGER;
BEGIN
  -- Fetch the organization's current plan
  SELECT subscription_plan
    INTO org_plan
    FROM public.organizations
   WHERE id = NEW.organization_id;

  -- Count existing non-deleted members
  SELECT COUNT(*)
    INTO current_cnt
    FROM public.people
   WHERE organization_id = NEW.organization_id;

  -- Map plan to member limit
  max_members := CASE COALESCE(LOWER(org_plan), 'starter')
    WHEN 'enterprise' THEN 2147483647
    WHEN 'pro'        THEN 2147483647
    WHEN 'growth'     THEN 1000
    WHEN 'starter'    THEN 200
    WHEN 'free'       THEN 200
    ELSE                   200
  END;

  IF current_cnt >= max_members THEN
    RAISE EXCEPTION
      'Member limit reached: your % plan allows up to % members. Upgrade to add more.',
      COALESCE(org_plan, 'starter'), max_members;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists so re-running migration is idempotent
DROP TRIGGER IF EXISTS enforce_member_limit_trigger ON public.people;

CREATE TRIGGER enforce_member_limit_trigger
  BEFORE INSERT ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_limit();

COMMENT ON FUNCTION public.enforce_member_limit() IS
  'Blocks inserts to people table when org has reached their plan member limit.';
