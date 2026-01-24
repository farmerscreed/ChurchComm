-- Phase 1: Follow-up Pipeline Foundation

-- 1. Create the follow_ups table
CREATE TABLE public.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
    call_log_id UUID REFERENCES public.vapi_call_logs(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes JSONB,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments for table and columns
COMMENT ON TABLE public.follow_ups IS 'Tracks follow-up tasks for people, generated from calls or created manually.';
COMMENT ON COLUMN public.follow_ups.status IS 'The current state of the follow-up task (e.g., new, in_progress, completed).';
COMMENT ON COLUMN public.follow_ups.priority IS 'The urgency of the follow-up (e.g., low, medium, high, urgent).';
COMMENT ON COLUMN public.follow_ups.assigned_to IS 'The staff member assigned to this follow-up.';
COMMENT ON COLUMN public.follow_ups.notes IS 'A log of actions and notes related to this follow-up.';


-- Enable RLS
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to manage follow-ups for their own organization"
ON public.follow_ups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_members.organization_id = follow_ups.organization_id
    AND organization_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_members.organization_id = follow_ups.organization_id
    AND organization_members.user_id = auth.uid()
  )
);


-- 2. Add 'stage' column to people table
ALTER TABLE public.people
ADD COLUMN stage TEXT DEFAULT 'prospect' CHECK (stage IN ('first_timer', 'prospect', 'regular_attendee', 'member'));

COMMENT ON COLUMN public.people.stage IS 'The stage of the person in the community journey (e.g., first_timer, prospect, member).';


-- 3. Create indexes for performance
CREATE INDEX idx_follow_ups_organization_id ON public.follow_ups(organization_id);
CREATE INDEX idx_follow_ups_status ON public.follow_ups(status);
CREATE INDEX idx_follow_ups_assigned_to ON public.follow_ups(assigned_to);
CREATE INDEX idx_people_stage ON public.people(stage);
