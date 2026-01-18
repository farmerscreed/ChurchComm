-- Fix the assigned_to foreign key to reference profiles instead of auth.users
-- This allows PostgREST to join and fetch full_name from profiles

-- Drop the existing foreign key constraint
ALTER TABLE public.follow_ups
DROP CONSTRAINT IF EXISTS follow_ups_assigned_to_fkey;

-- Add a new foreign key referencing profiles (which has the same id as auth.users)
ALTER TABLE public.follow_ups
ADD CONSTRAINT follow_ups_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
