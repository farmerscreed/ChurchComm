-- Phase 2: Calling Scripts

CREATE TABLE public.call_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT name_org_unique UNIQUE (name, organization_id)
);

-- Comments
COMMENT ON TABLE public.call_scripts IS 'Stores reusable AI calling scripts for campaigns.';
COMMENT ON COLUMN public.call_scripts.content IS 'The main body of the script/prompt for the AI agent.';

-- RLS
ALTER TABLE public.call_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage scripts for their own organization"
ON public.call_scripts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_members.organization_id = call_scripts.organization_id
    AND organization_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_members.organization_id = call_scripts.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_call_scripts_organization_id ON public.call_scripts(organization_id);
